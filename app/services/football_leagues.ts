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
 * goal-api.com league IDs: Premier League, La Liga, Bundesliga, Serie A,
 * Ligue 1, UEFA Champions League, Botola Pro
 */
const DEFAULT_GOAL_API_LEAGUE_IDS = [
  'cmr77dvkr005nrx06lp7rvp49',
  'cmr77dvnt006nrx063v3w622e',
  'cmr77dvgm0002rx06rt2uqxii',
  'cmr77dvpd006yrx06zig7907g',
  'cmr77dvqg007crx06q1kaceyo',
  'cmr77dw3900f5rx06j05wgzv4',
  'cmr77dw7800g9rx06v6a4zya0',
]

/**
 * Leagues the app covers on goal-api.com, from GOAL_API_LEAGUE_IDS
 * (comma-separated goal-api league IDs, found with GET /v1/leagues?search=).
 */
export function goalApiLeagueIds(): string[] {
  const configured = (env.get('GOAL_API_LEAGUE_IDS') || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9]+$/i.test(id))

  return configured.length > 0 ? configured : DEFAULT_GOAL_API_LEAGUE_IDS
}

/**
 * API-Football season (the year the season starts, e.g. 2026 for 2026/27).
 * Only meaningful together with a league; a date alone identifies fixtures.
 */
export function currentSeason(): string | undefined {
  return env.get('AF_SEASON')?.toString()
}
