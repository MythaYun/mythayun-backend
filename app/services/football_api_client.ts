import { request } from 'undici'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export interface FixtureResponse {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    periods: {
      first: number | null
      second: number | null
    }
    venue: {
      id: number | null
      name: string | null
      city: string | null
    }
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    round: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
}

export interface EventResponse {
  time: {
    elapsed: number
    extra: number | null
  }
  team: {
    id: number
    name: string
    logo: string
  }
  player: {
    id: number | null
    name: string | null
  }
  assist: {
    id: number | null
    name: string | null
  }
  type: string
  detail: string
  comments: string | null
}

export interface MatchStatistic {
  type: string
  value: number | string | null
}

export interface TeamStatistics {
  team: {
    id: number
    name: string
    logo: string
  }
  statistics: MatchStatistic[]
}

export interface StatisticsResponse {
  team: {
    id: number
    name: string
    logo: string
  }
  statistics: Array<{
    type: string
    value: number | string | null
  }>
}

export interface LeagueResponse {
  league: {
    id: number
    name: string
    type: string
    logo: string
  }
  country: {
    name: string
    code: string | null
    flag: string | null
  }
  seasons: Array<{
    year: number
    start: string
    end: string
    current: boolean
    coverage: {
      fixtures: {
        events: boolean
        lineups: boolean
        statistics_fixtures: boolean
        statistics_players: boolean
      }
      standings: boolean
      players: boolean
      top_scorers: boolean
      top_assists: boolean
      top_cards: boolean
      injuries: boolean
      predictions: boolean
      odds: boolean
    }
  }>
}

export default class FootballApiClient {
  private baseUrl = 'https://api-football-v1.p.rapidapi.com/v3'
  private headers = {
    'X-RapidAPI-Key': env.get('RAPIDAPI_KEY'),
    'X-RapidAPI-Host': env.get('RAPIDAPI_HOST'),
    'Content-Type': 'application/json',
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value)
    })

    const startTime = Date.now()
    
    try {
      logger.info(`Football API request: ${url.pathname}${url.search}`)
      
      const response = await request(url.toString(), {
        method: 'GET',
        headers: this.headers,
      })

      const duration = Date.now() - startTime
      
      if (response.statusCode !== 200) {
        logger.error(`Football API error: ${response.statusCode}`, {
          endpoint,
          params,
          duration,
        })
        throw new Error(`Football API returned ${response.statusCode}`)
      }

      const data = await response.body.json() as { response: T }
      
      logger.info(`Football API success: ${url.pathname}`, {
        duration,
        responseCount: Array.isArray(data.response) ? data.response.length : 1,
      })

      return data.response
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Football API request failed', {
        endpoint,
        params,
        duration,
        error: error.message,
      })
      throw error
    }
  }

  async getFixtures(date: string, leagueId?: string, season?: string): Promise<FixtureResponse[]> {
    const params: Record<string, string> = { date }
    if (leagueId) params.league = leagueId
    if (season) params.season = season

    return this.makeRequest<FixtureResponse[]>('/fixtures', params)
  }

  async getLiveFixtures(leagueIds?: string[]): Promise<FixtureResponse[]> {
    const params: Record<string, string> = {}
    
    if (leagueIds && leagueIds.length > 0) {
      params.live = leagueIds.join(',')
    } else {
      params.live = 'all'
    }

    return this.makeRequest<FixtureResponse[]>('/fixtures', params)
  }

  async getFixtureEvents(fixtureId: string): Promise<EventResponse[]> {
    return this.makeRequest<EventResponse[]>('/fixtures/events', { fixture: fixtureId })
  }

  async getLeagues(search?: string): Promise<LeagueResponse[]> {
    const params: Record<string, string> = {}
    if (search) params.search = search

    return this.makeRequest<LeagueResponse[]>('/leagues', params)
  }

  async getFixtureById(fixtureId: string): Promise<FixtureResponse[]> {
    return this.makeRequest<FixtureResponse[]>('/fixtures', { id: fixtureId })
  }

  /**
   * Get advanced match statistics (possession, shots, corners, etc.)
   * This is crucial for providing rich match analysis to users
   */
  async getFixtureStatistics(fixtureId: string): Promise<StatisticsResponse[]> {
    try {
      logger.info(`Fetching advanced statistics for fixture ${fixtureId}`)
      return this.makeRequest<StatisticsResponse[]>('/fixtures/statistics', { fixture: fixtureId })
    } catch (error) {
      logger.warn(`Failed to fetch statistics for fixture ${fixtureId}`, { error: error.message })
      // Return empty array instead of throwing to maintain app stability
      return []
    }
  }

  /**
   * Get team lineups for a specific fixture
   * Provides formation and player information
   */
  async getFixtureLineups(fixtureId: string): Promise<any[]> {
    try {
      logger.info(`Fetching lineups for fixture ${fixtureId}`)
      return this.makeRequest<any[]>('/fixtures/lineups', { fixture: fixtureId })
    } catch (error) {
      logger.warn(`Failed to fetch lineups for fixture ${fixtureId}`, { error: error.message })
      return []
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]
      await this.getFixtures(today)
      return true
    } catch (error) {
      logger.error('Football API health check failed', { error: error.message })
      return false
    }
  }
}
