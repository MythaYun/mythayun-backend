import { request } from 'undici'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

/**
 * Raw goal-api.com types, limited to the fields we read. Scores and minutes
 * arrive as strings; see goal_api_mapper for the conversion.
 */
export interface GoalApiFixture {
  id: string
  leagueId: string
  leagueName: string
  countryName: string | null
  kickoffUtc: string
  matchStatus: string
  matchPeriod: string | null
  matchElapsed: number | string | null
  homeTeamId: string
  homeTeamName: string
  homeTeamScore: string | null
  awayTeamId: string
  awayTeamName: string
  awayTeamScore: string | null
  matchStadium: string | null
  matchReferee: string | null
  teamHomeBadge: string | null
  teamAwayBadge: string | null
  homeTeam?: { name?: string; badge?: string | null }
  awayTeam?: { name?: string; badge?: string | null }
}

export interface GoalApiGoal {
  id: string
  time: string
  homeScorer: string | null
  homeAssist: string | null
  awayScorer: string | null
  awayAssist: string | null
  info: string | null
}

export interface GoalApiCard {
  id: string
  time: string
  card: string
  homeFault: string | null
  awayFault: string | null
}

export interface GoalApiSubstitution {
  id: string
  time: string
  substitution: string
  team: 'home' | 'away' | string
}

export interface GoalApiStatistic {
  type: string
  home: string | null
  away: string | null
  half: string
}

/** GET /fixtures/{id}: the match with everything embedded */
export interface GoalApiFixtureDetails extends GoalApiFixture {
  events?: GoalApiGoal[]
  cards?: GoalApiCard[]
  substitutions?: GoalApiSubstitution[]
  statistics?: GoalApiStatistic[]
}

interface Envelope<T> {
  success?: boolean
  data: T
  error?: string
  pagination?: { total: number; limit: number; offset: number; hasMore: boolean }
}

const PAGE_SIZE = 100

export default class GoalApiClient {
  private baseUrl = 'https://api.goal-api.com/v1'

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<Envelope<T>> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

    const startTime = Date.now()
    const response = await request(url.toString(), {
      method: 'GET',
      headers: { authorization: `Bearer ${env.get('GOAL_API_KEY')}` },
      headersTimeout: 15_000,
      bodyTimeout: 15_000,
    })
    const body = (await response.body.json().catch(() => null)) as Envelope<T> | null

    if (response.statusCode === 404) {
      return { success: false, data: null as T }
    }
    if (response.statusCode !== 200 || !body || body.success === false) {
      logger.error('goal-api request failed', {
        path: url.pathname,
        status: response.statusCode,
        error: body?.error,
        duration: Date.now() - startTime,
      })
      throw new Error(`goal-api returned ${response.statusCode}${body?.error ? `: ${body.error}` : ''}`)
    }

    logger.info(`goal-api ${url.pathname}`, {
      duration: Date.now() - startTime,
      remaining: response.headers['x-ratelimit-remaining'],
    })
    return body
  }

  /** Fixtures of one league between two dates (inclusive), all pages */
  async getLeagueFixtures(leagueId: string, from: string, to: string): Promise<GoalApiFixture[]> {
    const fixtures: GoalApiFixture[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await this.get<GoalApiFixture[]>('/fixtures', {
        leagueId,
        from,
        to,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      fixtures.push(...(page.data || []))
      if (!page.pagination?.hasMore) break
    }
    return fixtures
  }

  async getFixture(fixtureId: string): Promise<GoalApiFixtureDetails | null> {
    const response = await this.get<GoalApiFixtureDetails | null>(`/fixtures/${encodeURIComponent(fixtureId)}`)
    return response.data ?? null
  }

  /** Cheapest authenticated call, used by the health check */
  async ping(): Promise<void> {
    await this.get('/countries', { limit: '1' })
  }
}
