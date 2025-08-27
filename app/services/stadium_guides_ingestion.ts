import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Venue from '../models/venue.js'
import StadiumGuide from '../models/stadium_guide.js'
import TripAdvisorService from './trip_advisor_service.js'

/**
 * StadiumGuidesIngestion - Service for automated stadium guide creation and enrichment
 * 
 * Handles the automated process of:
 * - Creating new stadium guides for venues without guides
 * - Enriching stadium guides with third-party data (TripAdvisor)
 * - Updating existing guides with fresh content
 * 
 * This component is designed to be integrated with the main data ingestion pipeline
 */
@inject()
export default class StadiumGuidesIngestion {
  constructor(private tripAdvisorService: TripAdvisorService) {}

  /**
   * Process venues to create or update stadium guides
   * @param venueIds Optional array of specific venue IDs to process, otherwise processes all venues
   * @param forceUpdate If true, will update existing guides, otherwise skips them
   * @returns Processing statistics
   */
  async process(venueIds?: string[], forceUpdate = false): Promise<{
    processed: number
    created: number
    updated: number
    skipped: number
    failed: number
  }> {
    const stats = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    }

    try {
      // Query venues
      const venueQuery = Venue.query()
      
      // Filter by specific venue IDs if provided
      if (venueIds && venueIds.length > 0) {
        venueQuery.whereIn('id', venueIds)
      }
      
      const venues = await venueQuery.exec()
      logger.info(`Processing ${venues.length} venues for stadium guides`)

      // Process each venue
      for (const venue of venues) {
        stats.processed++
        
        try {
          // Check if a stadium guide already exists for this venue
          const existingGuide = await StadiumGuide.query()
            .where('venue_id', venue.id)
            .first()

          if (existingGuide && !forceUpdate) {
            // Skip existing guides unless force update is enabled
            logger.debug(`Stadium guide already exists for venue ${venue.id}, skipping`)
            stats.skipped++
            continue
          }

          if (existingGuide) {
            // Update existing guide
            await this.updateStadiumGuide(existingGuide, venue)
            stats.updated++
            logger.debug(`Updated stadium guide for venue ${venue.id}`)
          } else {
            // Create new guide
            await this.createStadiumGuide(venue)
            stats.created++
            logger.debug(`Created new stadium guide for venue ${venue.id}`)
          }
        } catch (error) {
          stats.failed++
          logger.error(`Failed to process stadium guide for venue ${venue.id}:`, error)
        }
      }

      return stats
    } catch (error) {
      logger.error('Stadium guides ingestion process failed:', error)
      throw error
    }
  }

  /**
   * Enrich all existing stadium guides with third-party data
   * @returns Processing statistics
   */
  async enrichAllGuides(): Promise<{
    processed: number
    enriched: number
    failed: number
  }> {
    const stats = {
      processed: 0,
      enriched: 0,
      failed: 0
    }

    try {
      // Get all existing guides
      const guides = await StadiumGuide.query()
        .preload('venue')
        .exec()
      
      logger.info(`Enriching ${guides.length} stadium guides`)

      // Process each guide
      for (const guide of guides) {
        stats.processed++
        
        try {
          await this.enrichStadiumGuide(guide)
          stats.enriched++
        } catch (error) {
          stats.failed++
          logger.error(`Failed to enrich stadium guide ${guide.id}:`, error)
        }
      }

      return stats
    } catch (error) {
      logger.error('Stadium guides enrichment process failed:', error)
      throw error
    }
  }

  /**
   * Create a new stadium guide for a venue
   * @param venue The venue to create a guide for
   * @returns The created stadium guide
   */
  private async createStadiumGuide(venue: Venue): Promise<StadiumGuide> {
    try {
      // Basic guide data
      const guideData = {
        venueId: venue.id,
        title: `Guide to ${venue.name}`,
        sections: [],
        facilities: [],
        images: []
      }

      // Create the guide
      const guide = await StadiumGuide.create(guideData)
      
      // Enrich with additional data from third-party services
      await this.enrichStadiumGuide(guide)
      
      return guide
    } catch (error) {
      logger.error(`Failed to create stadium guide for venue ${venue.id}:`, error)
      throw error
    }
  }

  /**
   * Update an existing stadium guide
   * @param guide The guide to update
   * @param venue The associated venue
   * @returns The updated stadium guide
   */
  private async updateStadiumGuide(guide: StadiumGuide, venue: Venue): Promise<StadiumGuide> {
    try {
      // Update basic information
      guide.title = `Guide to ${venue.name}`
      
      // Save changes
      await guide.save()
      
      // Re-enrich with third-party data
      await this.enrichStadiumGuide(guide)
      
      return guide
    } catch (error) {
      logger.error(`Failed to update stadium guide ${guide.id}:`, error)
      throw error
    }
  }

  /**
   * Enrich a stadium guide with third-party data
   * @param guide The guide to enrich
   * @returns The enriched stadium guide
   */
  private async enrichStadiumGuide(guide: StadiumGuide): Promise<StadiumGuide> {
    try {
      // Ensure venue is loaded
      if (!guide.venue) {
        await guide.load('venue')
      }

      const venue = guide.venue
      
      // Skip enrichment if the venue doesn't have enough information
      if (!venue || !venue.name || !venue.city) {
        logger.warn(`Cannot enrich guide ${guide.id}: Missing venue data`)
        return guide
      }
      
      // Get enrichment data from TripAdvisor service
      const searchQuery = `${venue.name} stadium ${venue.city || ''}`
      const tripAdvisorData = await this.tripAdvisorService.getStadiumInfo(searchQuery, venue.city)
      
      if (!tripAdvisorData) {
        logger.warn(`No TripAdvisor data found for ${venue.name}`)
        return guide
      }

      // Extract sections from TripAdvisor data
      const sections = [
        {
          title: 'Stadium Overview',
          content: tripAdvisorData.overview || `${venue.name} is a sports venue located in ${venue.city || ''}.`
        },
        {
          title: 'City Highlights',
          content: tripAdvisorData.cityHighlights || `${venue.city} is a vibrant city with plenty to offer visitors.`
        }
      ]

      // Extract facilities
      const facilities = tripAdvisorData.facilities || [
        'Seating',
        'Concessions',
        'Restrooms',
        'Merchandise Shops'
      ]

      // Extract images
      const images = tripAdvisorData.images || []
      
      // Update guide with enriched data
      guide.merge({
        sections,
        facilities,
        images
      })
      
      await guide.save()
      
      return guide
    } catch (error) {
      logger.error(`Failed to enrich stadium guide ${guide.id}:`, error)
      throw error
    }
  }
}
