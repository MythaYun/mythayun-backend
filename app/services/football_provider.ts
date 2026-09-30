import env from '#start/env'
import type { MappedFixture, MappedStatistics } from '#services/football_data_mapper'

/**
 * Event on the match details page. `type` is one of GOAL, YELLOW_CARD,
 * RED_CARD, SUBSTITUTION (API-Football may also send CARD / SUBST).
 */
export interface MatchDetailsEvent {
  id: string
  ts: string
  type: string
  minute: number
  teamId: string
  playerName: string | null
  assistPlayerName?: string | null
  detail: string
}

export interface MatchDetails extends MappedFixture {
  events: MatchDetailsEvent[]
  statistics: MappedStatistics
  referee?: string | null
}

/**
 * Source of football data for the API. Every provider returns the same
 * response shapes, so controllers and the frontend don't know which one is
 * behind them. Switching provider = one environment variable.
 */
export interface FootballProvider {
  readonly name: string
  /** Fixtures on `date` (YYYY-MM-DD) for one league, or for every league we cover */
  getFixtures(date: string, leagueId?: string): Promise<MappedFixture[]>
  /**
   * Fixtures from `from` to `to` (YYYY-MM-DD, both included, at most
   * MAX_RANGE_DAYS days), sorted by kick-off. Callers validate the range first.
   */
  getFixturesRange(from: string, to: string, leagueId?: string): Promise<MappedFixture[]>
  /** Matches in play right now in the leagues we cover */
  getLiveFixtures(): Promise<MappedFixture[]>
  /** One match with events and statistics, or null if it doesn't exist */
  getMatchDetails(matchId: string): Promise<MatchDetails | null>
  healthCheck(): Promise<boolean>
}

let provider: FootballProvider | null = null

/**
 * goal-api.com when GOAL_API_KEY is set, API-Football otherwise.
 */
export async function getFootballProvider(): Promise<FootballProvider> {
  if (!provider) {
    if (env.get('GOAL_API_KEY')) {
      const { default: GoalApiProvider } = await import('#services/goal_api_provider')
      provider = new GoalApiProvider()
    } else {
      const { default: ApiFootballProvider } = await import('#services/api_football_provider')
      provider = new ApiFootballProvider()
    }
  }
  return provider
}
