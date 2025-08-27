import { request } from 'undici'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { inject } from '@adonisjs/core'

/**
 * TripAdvisor data structure for stadium and city information
 */
export interface TripAdvisorData {
  overview?: string
  cityHighlights?: string
  attractions?: Array<{
    name: string
    description?: string
    rating?: number
    distance?: string
  }>
  restaurants?: Array<{
    name: string
    cuisine?: string
    rating?: number
    distance?: string
  }>
  transport?: {
    nearby?: string
    directions?: string
  }
  facilities?: string[]
  images?: string[]
}

/**
 * TripAdvisorService - Service for integrating with TripAdvisor Content API
 * 
 * Provides rich data about stadiums and cities including:
 * - Location search and details
 * - Nearby attractions and restaurants
 * - Transportation info
 * - Photos and media
 */
@inject()
export default class TripAdvisorService {
  private apiKey: string
  private baseUrl = 'https://api.content.tripadvisor.com/api/v1'
  private enabled: boolean

  constructor() {
    this.apiKey = env.get('TRIP_ADVISOR_API_KEY', '')
    this.enabled = !!this.apiKey
    
    if (!this.enabled) {
      logger.warn('TripAdvisor API integration disabled: No API key provided')
    }
  }

  /**
   * Get information about a stadium and its surroundings
   * @param searchQuery The search query, typically stadium name + city
   * @param cityName The city name for additional city guide information
   * @returns Comprehensive stadium and city information
   */
  async getStadiumInfo(searchQuery: string, cityName: string): Promise<TripAdvisorData | null> {
    try {
      if (!this.enabled) {
        return this.getMockStadiumInfo(searchQuery, cityName)
      }

      // Search for the stadium location
      const locationData = await this.searchLocation(searchQuery)
      if (!locationData || !locationData.location_id) {
        logger.warn(`No location found for query: ${searchQuery}`)
        return this.getMockStadiumInfo(searchQuery, cityName)
      }

      const locationId = locationData.location_id
      
      // Get details about the stadium
      const details = await this.getLocationDetails(locationId)
      
      // Get nearby attractions
      const attractions = await this.getNearbyAttractions(locationId)
      
      // Get nearby restaurants
      const restaurants = await this.getNearbyRestaurants(locationId)
      
      // Get location photos
      const photos = await this.getLocationPhotos(locationId)
      
      // Get city guide
      const cityGuide = await this.getCityGuide(cityName)

      // Compile all data
      const tripAdvisorData: TripAdvisorData = {
        overview: details?.description || locationData.name,
        cityHighlights: cityGuide?.description,
        attractions: attractions?.map(a => ({
          name: a.name,
          description: a.description,
          rating: a.rating,
          distance: a.distance
        })),
        restaurants: restaurants?.map(r => ({
          name: r.name,
          cuisine: r.cuisine?.join(', '),
          rating: r.rating,
          distance: r.distance
        })),
        transport: {
          nearby: details?.transportation,
          directions: details?.address_obj ? 
            `Located at ${details.address_obj.street1}, ${details.address_obj.city}` : 
            undefined
        },
        facilities: details?.amenities || ['Seating', 'Food & Beverages', 'Restrooms'],
        images: photos?.map(p => p.images.large.url)
      }

      return tripAdvisorData

    } catch (error) {
      logger.error('TripAdvisor API error:', error)
      return this.getMockStadiumInfo(searchQuery, cityName)
    }
  }

  /**
   * Search for locations by query
   * @param query The search query
   * @returns Location search results
   */
  private async searchLocation(query: string): Promise<any> {
    try {
      const response = await request(`${this.baseUrl}/location/search`, {
        method: 'GET',
        query: {
          key: this.apiKey,
          searchQuery: query,
          category: 'attractions',
          language: 'en'
        }
      })
      
      const data = await response.body.json() as any
      return data.data?.[0] || null
    
    } catch (error) {
      logger.error(`TripAdvisor location search failed for query "${query}":`, error)
      return null
    }
  }

  /**
   * Get details about a specific location
   * @param locationId The TripAdvisor location ID
   * @returns Location details
   */
  private async getLocationDetails(locationId: string): Promise<any> {
    try {
      const response = await request(`${this.baseUrl}/location/${locationId}/details`, {
        method: 'GET',
        query: {
          key: this.apiKey,
          language: 'en'
        }
      })
      
      const data = await response.body.json()
      return data
    
    } catch (error) {
      logger.error(`TripAdvisor location details failed for location ${locationId}:`, error)
      return null
    }
  }

  /**
   * Get nearby attractions for a location
   * @param locationId The TripAdvisor location ID
   * @returns Array of nearby attractions
   */
  private async getNearbyAttractions(locationId: string): Promise<any[]> {
    try {
      const response = await request(`${this.baseUrl}/location/${locationId}/nearby_attractions`, {
        method: 'GET',
        query: {
          key: this.apiKey,
          language: 'en'
        }
      })
      
      const data = await response.body.json() as any
      return data.data || []
    
    } catch (error) {
      logger.error(`TripAdvisor nearby attractions failed for location ${locationId}:`, error)
      return []
    }
  }

  /**
   * Get nearby restaurants for a location
   * @param locationId The TripAdvisor location ID
   * @returns Array of nearby restaurants
   */
  private async getNearbyRestaurants(locationId: string): Promise<any[]> {
    try {
      const response = await request(`${this.baseUrl}/location/${locationId}/nearby_restaurants`, {
        method: 'GET',
        query: {
          key: this.apiKey,
          language: 'en'
        }
      })
      
      const data = await response.body.json() as any
      return data.data || []
    
    } catch (error) {
      logger.error(`TripAdvisor nearby restaurants failed for location ${locationId}:`, error)
      return []
    }
  }

  /**
   * Get photos for a location
   * @param locationId The TripAdvisor location ID
   * @returns Array of photos
   */
  private async getLocationPhotos(locationId: string): Promise<any[]> {
    try {
      const response = await request(`${this.baseUrl}/location/${locationId}/photos`, {
        method: 'GET',
        query: {
          key: this.apiKey,
          language: 'en'
        }
      })
      
      const data = await response.body.json() as any
      return data.data || []
    
    } catch (error) {
      logger.error(`TripAdvisor photos failed for location ${locationId}:`, error)
      return []
    }
  }

  /**
   * Get a city guide for a city name
   * @param cityName The name of the city
   * @returns City guide information
   */
  private async getCityGuide(cityName: string): Promise<any> {
    try {
      // Search for the city first to get its location ID
      const cityLocation = await this.searchLocation(cityName)
      
      if (!cityLocation?.location_id) {
        return null
      }
      
      // Get city details
      return await this.getLocationDetails(cityLocation.location_id)
    
    } catch (error) {
      logger.error(`TripAdvisor city guide failed for city ${cityName}:`, error)
      return null
    }
  }

  /**
   * Generate mock stadium information when API is unavailable
   * @param searchQuery The search query used (for generating relevant mock data)
   * @param cityName The city name
   * @returns Mock TripAdvisor data
   */
  private getMockStadiumInfo(searchQuery: string, cityName: string): TripAdvisorData {
    const stadiumName = searchQuery.split(' ')[0] || 'Stadium'
    
    return {
      overview: `${stadiumName} is a major sports venue located in ${cityName}. It hosts various sporting events throughout the year and has modern facilities for spectators.`,
      cityHighlights: `${cityName} is a vibrant city with rich history, culture, and entertainment options. Visitors can enjoy museums, parks, shopping districts, and a variety of dining experiences.`,
      attractions: [
        {
          name: `${cityName} Museum`,
          description: 'A cultural institution showcasing the history and art of the region.',
          rating: 4.5,
          distance: '1.2 km'
        },
        {
          name: `${cityName} Park`,
          description: 'Spacious green space ideal for relaxation and outdoor activities.',
          rating: 4.3,
          distance: '0.8 km'
        },
        {
          name: 'Shopping District',
          description: 'Popular shopping area with various retail stores and boutiques.',
          rating: 4.0,
          distance: '1.5 km'
        }
      ],
      restaurants: [
        {
          name: 'The Stadium Grill',
          cuisine: 'American, Sports Bar',
          rating: 4.2,
          distance: '0.3 km'
        },
        {
          name: `${cityName} Fine Dining`,
          cuisine: 'International, Gourmet',
          rating: 4.6,
          distance: '1.0 km'
        },
        {
          name: 'Local Favorites',
          cuisine: 'Local, Traditional',
          rating: 4.4,
          distance: '0.7 km'
        }
      ],
      transport: {
        nearby: `Public transportation options include bus stops and metro stations within walking distance. Taxis and ride-sharing services are readily available.`,
        directions: `${stadiumName} is located in the central district of ${cityName}, easily accessible from major highways and public transportation.`
      },
      facilities: [
        'Seating',
        'Food & Beverage Concessions',
        'Restrooms',
        'Merchandise Shops',
        'First Aid Stations',
        'Information Desks',
        'VIP Areas',
        'Accessible Facilities'
      ],
      images: [
        'https://example.com/stadium-exterior.jpg',
        'https://example.com/stadium-interior.jpg',
        'https://example.com/stadium-pitch.jpg'
      ]
    }
  }
}
