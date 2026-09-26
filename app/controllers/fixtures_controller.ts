import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import FootballApiClient from '#services/football_api_client'
import FootballDataMapper from '#services/football_data_mapper'
import { targetLeagueIds } from '#services/football_leagues'

export default class FixturesController {
  private footballApi = new FootballApiClient()

  async index({ request, response }: HttpContext) {
    const date = request.input('date', new Date().toISOString().split('T')[0])
    const leagueId = request.input('leagueId')
    
    // Mock data for fast frontend development
    if (env.get('MOCK_API', 'false') === 'true') {
      return response.json([
        {
          id: 'mock-1',
          startTime: '2025-08-09T19:00:00Z',
          status: 'NS', // Not Started
          league: {
            id: 'epl',
            name: 'Premier League',
            country: 'England'
          },
          homeTeam: {
            id: 'arsenal',
            name: 'Arsenal',
            shortName: 'ARS',
            logoUrl: 'https://logos.com/arsenal.png'
          },
          awayTeam: {
            id: 'chelsea',
            name: 'Chelsea',
            shortName: 'CHE',
            logoUrl: 'https://logos.com/chelsea.png'
          },
          score: {
            home: null,
            away: null
          },
          venue: {
            id: 'emirates',
            name: 'Emirates Stadium',
            city: 'London'
          }
        },
        {
          id: 'mock-2',
          startTime: '2025-08-09T16:30:00Z',
          status: 'LIVE',
          league: {
            id: 'laliga',
            name: 'LaLiga',
            country: 'Spain'
          },
          homeTeam: {
            id: 'barcelona',
            name: 'FC Barcelona',
            shortName: 'BAR',
            logoUrl: 'https://logos.com/barcelona.png'
          },
          awayTeam: {
            id: 'realmadrid',
            name: 'Real Madrid',
            shortName: 'RMA',
            logoUrl: 'https://logos.com/realmadrid.png'
          },
          score: {
            home: 1,
            away: 2
          },
          minute: 67,
          venue: {
            id: 'campnou',
            name: 'Camp Nou',
            city: 'Barcelona'
          }
        }
      ])
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return response.status(400).json({
        error: { code: 'INVALID_DATE', message: 'date must be YYYY-MM-DD' }
      })
    }
    if (leagueId !== undefined && leagueId !== null && !/^\d+$/.test(String(leagueId))) {
      return response.status(400).json({
        error: { code: 'INVALID_LEAGUE', message: 'leagueId must be a numeric API-Football league ID' }
      })
    }

    try {
      // One date-only call, filtered here. A date alone identifies fixtures,
      // and league+season queries are blocked for the current season on
      // API-Football's free plan, so we never send a season from this endpoint.
      const leagues = new Set(leagueId ? [String(leagueId)] : targetLeagueIds())
      const fixtures = (await this.footballApi.getFixtures(date)).filter((fixture) =>
        leagues.has(String(fixture.league.id))
      )

      // Transform API response using our data mapper
      const transformedFixtures = fixtures.map(fixture => 
        FootballDataMapper.mapFixtureToResponse(fixture)
      )

      return response.json(transformedFixtures)
    } catch (error) {
      return response.status(500).json({
        error: {
          code: 'FIXTURES_ERROR',
          message: 'Failed to fetch fixtures'
        }
      })
    }
  }

  async live({ response }: HttpContext) {
    // Mock data for development
    if (env.get('MOCK_API', 'false') === 'true') {
      return response.json([
        {
          id: 'mock-live-1',
          startTime: '2025-08-09T16:30:00Z',
          status: 'LIVE',
          minute: 73,
          league: {
            id: 'ucl',
            name: 'UEFA Champions League',
            country: 'Europe'
          },
          homeTeam: {
            id: 'psg',
            name: 'Paris Saint-Germain',
            shortName: 'PSG',
            logoUrl: 'https://logos.com/psg.png'
          },
          awayTeam: {
            id: 'bayern',
            name: 'Bayern Munich',
            shortName: 'BAY',
            logoUrl: 'https://logos.com/bayern.png'
          },
          score: {
            home: 2,
            away: 1
          }
        }
      ])
    }

    try {
      // Live fixtures for the leagues we cover
      const liveFixtures = await this.footballApi.getLiveFixtures(targetLeagueIds())
      
      // Transform API response using our data mapper
      const transformedFixtures = liveFixtures.map(fixture => 
        FootballDataMapper.mapFixtureToResponse(fixture)
      )

      return response.json(transformedFixtures)
    } catch (error) {
      return response.status(500).json({
        error: {
          code: 'LIVE_FIXTURES_ERROR',
          message: 'Failed to fetch live fixtures'
        }
      })
    }
  }
}
