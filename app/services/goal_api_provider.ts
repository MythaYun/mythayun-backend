import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import GoalApiClient, { type GoalApiFixture } from '#services/goal_api_client'
import { IN_PLAY_CODES, mapFixture, mapFixtureDetails, toStatusCode } from '#services/goal_api_mapper'
import { goalApiLeagueIds } from '#services/football_leagues'
import ResponseCache from '#services/response_cache'
import type { FootballProvider, MatchDetails } from '#services/football_provider'
import type { MappedFixture } from '#services/football_data_mapper'
import { isoDate, shiftDays } from '#services/date_range'

const MINUTE = 60
const HOUR = 60 * MINUTE

/**
 * goal-api.com (https://goal-api.com). Used when GOAL_API_KEY is set.
 *
 * Request budget: the free plan allows 1,000 requests/day, so every call is
 * cached and shared between visitors. For each league we fetch one window,
 * yesterday to tomorrow (UTC), with a single request; the fixtures page for
 * those dates, the live page and matches running past midnight all read from
 * it. The cache lifetime follows the matches: GOAL_API_LIVE_TTL_SECONDS while
 * one is in play or about to kick off, longer otherwise.
 */
export default class GoalApiProvider implements FootballProvider {
  readonly name = 'goal-api'
  private client = new GoalApiClient()
  private cache = new ResponseCache()

  private get liveTtl(): number {
    const configured = Number(env.get('GOAL_API_LIVE_TTL_SECONDS', '120'))
    return Number.isFinite(configured) && configured >= 15 ? configured : 120
  }

  /**
   * Seconds to keep a set of fixtures: short while something is in play or
   * about to start, up to `maxSeconds` (30 minutes by default) when nothing
   * will change soon.
   */
  private fixturesTtl(
    fixtures: GoalApiFixture[],
    allInPast: boolean,
    maxSeconds = 30 * MINUTE
  ): number {
    if (allInPast) return 6 * HOUR

    const now = Date.now()
    let nextKickoff = Number.POSITIVE_INFINITY
    for (const fixture of fixtures) {
      const status = toStatusCode(fixture.matchStatus, fixture.matchPeriod)
      if (IN_PLAY_CODES.has(status)) return this.liveTtl
      if (status === 'NS') {
        const kickoff = Date.parse(fixture.kickoffUtc)
        // Kicked off by the clock but not reported live yet: poll as live
        if (kickoff <= now) return this.liveTtl
        nextKickoff = Math.min(nextKickoff, kickoff)
      }
    }

    // Refresh 15 minutes before the next kickoff, at most every `maxSeconds`
    const untilNext = (nextKickoff - now) / 1000 - 15 * MINUTE
    return Math.round(Math.max(this.liveTtl, Math.min(untilNext, maxSeconds)))
  }

  /** One league's fixtures from yesterday to tomorrow (UTC), cached */
  private leagueWindow(leagueId: string): Promise<GoalApiFixture[]> {
    const today = isoDate(new Date())
    const from = shiftDays(today, -1)
    const to = shiftDays(today, 1)
    return this.cache.getOrLoad(
      `window:${leagueId}:${from}:${to}`,
      () => this.client.getLeagueFixtures(leagueId, from, to),
      (fixtures) => this.fixturesTtl(fixtures, false)
    )
  }

  /** One league's fixtures on a date outside the window, cached */
  private leagueDay(leagueId: string, date: string): Promise<GoalApiFixture[]> {
    const today = isoDate(new Date())
    return this.cache.getOrLoad(
      `day:${leagueId}:${date}`,
      () => this.client.getLeagueFixtures(leagueId, date, date),
      (fixtures) => this.fixturesTtl(fixtures, date < today)
    )
  }

  /**
   * One league's fixtures over several days outside the yesterday-to-tomorrow
   * window, with a single request. Past days never change much and are kept
   * for hours; upcoming days are kept up to 2 hours (they only change when a
   * match is moved or starts), less when a kickoff is close.
   */
  private leagueSpan(
    leagueId: string,
    from: string,
    to: string,
    inPast: boolean
  ): Promise<GoalApiFixture[]> {
    return this.cache.getOrLoad(
      `span:${leagueId}:${from}:${to}`,
      () => this.client.getLeagueFixtures(leagueId, from, to),
      (fixtures) => this.fixturesTtl(fixtures, inPast, 2 * HOUR)
    )
  }

  /**
   * Fetch several leagues in parallel. A league that fails is logged and
   * skipped, so one bad league doesn't blank the whole page; if every league
   * fails, the error is raised.
   */
  private async forLeagues(
    leagueIds: string[],
    load: (leagueId: string) => Promise<GoalApiFixture[]>
  ): Promise<GoalApiFixture[]> {
    const results = await Promise.allSettled(leagueIds.map(load))
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length === results.length && failures.length > 0) {
      throw (failures[0] as PromiseRejectedResult).reason
    }
    for (const failure of failures) {
      logger.warn('goal-api league fetch failed', { error: String((failure as PromiseRejectedResult).reason) })
    }
    return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  }

  private sortByKickoff(fixtures: MappedFixture[]): MappedFixture[] {
    return fixtures.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  }

  async getFixtures(date: string, leagueId?: string): Promise<MappedFixture[]> {
    const leagueIds = leagueId ? [leagueId] : goalApiLeagueIds()
    const today = isoDate(new Date())
    const inWindow = date >= shiftDays(today, -1) && date <= shiftDays(today, 1)

    const fixtures = await this.forLeagues(leagueIds, (id) =>
      inWindow ? this.leagueWindow(id) : this.leagueDay(id, date)
    )
    return this.sortByKickoff(
      fixtures.filter((fixture) => fixture.kickoffUtc.slice(0, 10) === date).map(mapFixture)
    )
  }

  /**
   * Fixtures over a range of days. Request budget per league: the part inside
   * the yesterday-to-tomorrow window comes from the shared window cache (no
   * extra request), and each side of it costs at most one request, however
   * many days it covers.
   */
  async getFixturesRange(from: string, to: string, leagueId?: string): Promise<MappedFixture[]> {
    const leagueIds = leagueId ? [leagueId] : goalApiLeagueIds()
    const today = isoDate(new Date())
    const windowStart = shiftDays(today, -1)
    const windowEnd = shiftDays(today, 1)

    const pastTo = to < windowStart ? to : shiftDays(windowStart, -1)
    const futureFrom = from > windowEnd ? from : shiftDays(windowEnd, 1)
    const touchesPast = from < windowStart
    const touchesWindow = from <= windowEnd && to >= windowStart
    const touchesFuture = to > windowEnd

    const fixtures = await this.forLeagues(leagueIds, async (id) => {
      const parts = await Promise.all([
        touchesPast ? this.leagueSpan(id, from, pastTo, true) : [],
        touchesWindow ? this.leagueWindow(id) : [],
        touchesFuture ? this.leagueSpan(id, futureFrom, to, false) : [],
      ])
      return parts.flat()
    })

    return this.sortByKickoff(
      fixtures
        .filter((fixture) => {
          const day = fixture.kickoffUtc.slice(0, 10)
          return day >= from && day <= to
        })
        .map(mapFixture)
    )
  }

  async getLiveFixtures(): Promise<MappedFixture[]> {
    const fixtures = await this.forLeagues(goalApiLeagueIds(), (id) => this.leagueWindow(id))
    return this.sortByKickoff(fixtures.map(mapFixture).filter((fixture) => IN_PLAY_CODES.has(fixture.status)))
  }

  async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    // goal-api IDs are lowercase letters and digits
    if (!/^[a-z0-9]{10,40}$/i.test(matchId)) return null

    const details = await this.cache.getOrLoad(
      `match:${matchId}`,
      () => this.client.getFixture(matchId),
      (fixture) => {
        if (!fixture) return 5 * MINUTE
        const status = toStatusCode(fixture.matchStatus, fixture.matchPeriod)
        if (IN_PLAY_CODES.has(status)) return Math.max(30, Math.round(this.liveTtl / 2))
        if (['FT', 'AET', 'PEN', 'AWD', 'CANC', 'ABD'].includes(status)) return 6 * HOUR
        return this.fixturesTtl([fixture], false)
      }
    )
    return details ? mapFixtureDetails(details) : null
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.cache.getOrLoad('health', () => this.client.ping(), () => 10 * MINUTE)
      return true
    } catch (error) {
      logger.error('goal-api health check failed', { error: String(error) })
      return false
    }
  }
}
