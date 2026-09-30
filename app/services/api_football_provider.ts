import FootballApiClient from '#services/football_api_client'
import FootballDataMapper from '#services/football_data_mapper'
import { targetLeagueIds } from '#services/football_leagues'
import { getFixturesRangeDayByDay } from '#services/date_range'
import type { FootballProvider, MatchDetails } from '#services/football_provider'

/**
 * API-Football (api-sports.io or RapidAPI). Used when GOAL_API_KEY isn't set.
 */
export default class ApiFootballProvider implements FootballProvider {
  readonly name = 'api-football'
  private client = new FootballApiClient()

  async getFixtures(date: string, leagueId?: string) {
    // One date-only call, filtered here. A date alone identifies fixtures,
    // and league+season queries are blocked for the current season on
    // API-Football's free plan, so we never send a season.
    const leagues = new Set(leagueId ? [leagueId] : targetLeagueIds())
    const fixtures = await this.client.getFixtures(date)
    return fixtures
      .filter((fixture) => leagues.has(String(fixture.league.id)))
      .map((fixture) => FootballDataMapper.mapFixtureToResponse(fixture))
  }

  async getFixturesRange(from: string, to: string, leagueId?: string) {
    // API-Football is queried one date at a time
    return getFixturesRangeDayByDay(this, from, to, leagueId)
  }

  async getLiveFixtures() {
    const fixtures = await this.client.getLiveFixtures(targetLeagueIds())
    return fixtures.map((fixture) => FootballDataMapper.mapFixtureToResponse(fixture))
  }

  async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    const fixtures = await this.client.getFixtureById(matchId)
    if (!fixtures || fixtures.length === 0) return null

    const fixture = fixtures[0]
    const [events, statistics] = await Promise.all([
      this.client.getFixtureEvents(matchId),
      this.client.getFixtureStatistics(matchId),
    ])

    return {
      ...FootballDataMapper.mapFixtureToResponse(fixture),
      events: events.map((event) => ({
        id: `${matchId}-${event.time.elapsed}-${event.type}`,
        ts: fixture.fixture.date,
        type: event.type.toUpperCase(),
        minute: event.time.elapsed,
        teamId: event.team.id.toString(),
        playerName: event.player.name,
        assistPlayerName: event.assist?.name ?? null,
        detail: event.detail,
      })),
      statistics: FootballDataMapper.mapStatisticsResponse(statistics),
      referee: fixture.fixture.referee,
    }
  }

  healthCheck() {
    return this.client.healthCheck()
  }
}
