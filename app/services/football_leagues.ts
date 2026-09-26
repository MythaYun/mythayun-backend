import env from '#start/env'

/**
 * API-Football league IDs: Premier League, La Liga, Bundesliga, Serie A, Ligue 1
 */
const DEFAULT_LEAGUE_IDS = ['39', '140', '78', '135', '61']

/**
 * Leagues the app covers, from AF_LEAGUE_SLUGS (comma-separated API-Football
 * league IDs). Falls back to the top 5 European leagues.
 */
export function targetLeagueIds(): string[] {
  const configured = (env.get('AF_LEAGUE_SLUGS') || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))

  return configured.length > 0 ? configured : DEFAULT_LEAGUE_IDS
}

/**
 * API-Football season (the year the season starts, e.g. 2026 for 2026/27).
 * Only meaningful together with a league; a date alone identifies fixtures.
 */
export function currentSeason(): string | undefined {
  return env.get('AF_SEASON')?.toString()
}
