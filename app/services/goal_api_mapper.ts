import FootballDataMapper, { type MappedFixture, type MappedStatistics } from '#services/football_data_mapper'
import type { MatchDetails, MatchDetailsEvent } from '#services/football_provider'
import type {
  GoalApiFixture,
  GoalApiFixtureDetails,
  GoalApiStatistic,
} from '#services/goal_api_client'

/**
 * Converts goal-api.com data into the response shapes the API already serves
 * (the API-Football-based ones), so the frontend needs no changes.
 *
 * goal-api reports a status (SCHEDULED, LIVE, FINISHED, ...) plus a period
 * (FIRST_HALF, SECOND_HALF, ...); we translate them to the short codes the
 * frontend understands (NS, 1H, HT, 2H, FT, ...).
 */
export function toStatusCode(status: string, period: string | null): string {
  switch (status) {
    case 'SCHEDULED':
      return 'NS'
    case 'LIVE':
      switch (period) {
        case 'FIRST_HALF':
          return '1H'
        case 'HALF_TIME':
          return 'HT'
        case 'SECOND_HALF':
          return '2H'
        case 'EXTRA_TIME':
          return 'ET'
        case 'PENALTIES':
          return 'P'
        default:
          return 'LIVE'
      }
    case 'HALF_TIME':
      return 'HT'
    case 'FINISHED':
      return 'FT'
    case 'AFTER_ET':
      return 'AET'
    case 'AFTER_PEN':
      return 'PEN'
    case 'POSTPONED':
      return 'PST'
    case 'CANCELLED':
      return 'CANC'
    case 'AWARDED':
      return 'AWD'
    case 'ABANDONED':
      return 'ABD'
    case 'SUSPENDED':
      return 'SUSP'
    default:
      return status
  }
}

/** Statuses during which the match is being played */
export const IN_PLAY_CODES = new Set(['1H', 'HT', '2H', 'ET', 'P', 'LIVE'])

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).replace('%', ''))
  return Number.isFinite(parsed) ? parsed : null
}

/** "63" -> 63, "90+6" -> { minute: 90, extra: 6 } */
function parseMinute(time: string | null | undefined): { minute: number; extra: number } {
  const [base, extra] = String(time ?? '').split('+')
  return { minute: toNumber(base) ?? 0, extra: toNumber(extra) ?? 0 }
}

export function mapFixture(fixture: GoalApiFixture): MappedFixture {
  const status = toStatusCode(fixture.matchStatus, fixture.matchPeriod)
  const elapsed = IN_PLAY_CODES.has(status) ? toNumber(fixture.matchElapsed) : null
  const homeName = fixture.homeTeamName || fixture.homeTeam?.name || 'Unknown'
  const awayName = fixture.awayTeamName || fixture.awayTeam?.name || 'Unknown'

  return {
    id: fixture.id,
    startTime: fixture.kickoffUtc,
    status,
    minute: elapsed,
    phase: FootballDataMapper.getPhaseFromStatus(status, elapsed),
    league: {
      id: fixture.leagueId,
      name: fixture.leagueName,
      country: fixture.countryName ?? '',
    },
    homeTeam: {
      id: fixture.homeTeamId,
      name: homeName,
      shortName: FootballDataMapper.generateShortName(homeName),
      logoUrl: fixture.teamHomeBadge || fixture.homeTeam?.badge || '',
    },
    awayTeam: {
      id: fixture.awayTeamId,
      name: awayName,
      shortName: FootballDataMapper.generateShortName(awayName),
      logoUrl: fixture.teamAwayBadge || fixture.awayTeam?.badge || '',
    },
    score: {
      home: toNumber(fixture.homeTeamScore),
      away: toNumber(fixture.awayTeamScore),
    },
    venue: fixture.matchStadium ? { id: null, name: fixture.matchStadium, city: null } : null,
  }
}

function mapEvents(fixture: GoalApiFixtureDetails): MatchDetailsEvent[] {
  const events: Array<MatchDetailsEvent & { extra: number }> = []
  const teamId = (side: 'home' | 'away') => (side === 'home' ? fixture.homeTeamId : fixture.awayTeamId)

  for (const goal of fixture.events ?? []) {
    const side = goal.homeScorer ? 'home' : 'away'
    const scorer = side === 'home' ? goal.homeScorer : goal.awayScorer
    const { minute, extra } = parseMinute(goal.time)
    const ownGoal = /\(o\.g\.\)/i.test(scorer ?? '')
    events.push({
      id: goal.id,
      ts: fixture.kickoffUtc,
      type: 'GOAL',
      minute,
      extra,
      teamId: teamId(side),
      playerName: scorer?.replace(/\s*\(o\.g\.\)\s*/i, '') || null,
      assistPlayerName: (side === 'home' ? goal.homeAssist : goal.awayAssist) || null,
      detail: ownGoal ? 'Own goal' : goal.info === 'Penalty' ? 'Penalty' : 'Goal',
    })
  }

  for (const card of fixture.cards ?? []) {
    const side = card.homeFault ? 'home' : 'away'
    const { minute, extra } = parseMinute(card.time)
    const red = /red/i.test(card.card)
    events.push({
      id: card.id,
      ts: fixture.kickoffUtc,
      type: red ? 'RED_CARD' : 'YELLOW_CARD',
      minute,
      extra,
      teamId: teamId(side),
      playerName: (side === 'home' ? card.homeFault : card.awayFault) || null,
      detail: card.card,
    })
  }

  for (const substitution of fixture.substitutions ?? []) {
    const side = substitution.team === 'home' ? 'home' : 'away'
    const { minute, extra } = parseMinute(substitution.time)
    // goal-api sends both players as "A | B" without saying which one came on
    const players = substitution.substitution.split('|').map((name) => name.trim()).filter(Boolean)
    events.push({
      id: substitution.id,
      ts: fixture.kickoffUtc,
      type: 'SUBSTITUTION',
      minute,
      extra,
      teamId: teamId(side),
      playerName: players.join(' / ') || null,
      detail: 'Substitution',
    })
  }

  return events
    .sort((a, b) => a.minute - b.minute || a.extra - b.extra)
    .map(({ extra: _extra, ...event }) => event)
}

function mapStatistics(fixture: GoalApiFixtureDetails): MappedStatistics {
  const statistics = FootballDataMapper.getEmptyStatistics()
  const all = fixture.statistics ?? []
  const fullTime = all.filter((stat) => stat.half === 'full')
  const rows = fullTime.length > 0 ? fullTime : all

  // A type can appear twice (e.g. Ball Possession 0%/0% and 43%/57%): keep the
  // last row that has data
  const byType = new Map<string, GoalApiStatistic>()
  for (const row of rows) {
    const hasData = (toNumber(row.home) ?? 0) + (toNumber(row.away) ?? 0) > 0
    if (hasData || !byType.has(row.type)) byType.set(row.type, row)
  }
  const pair = (type: string) => {
    const row = byType.get(type)
    return { home: toNumber(row?.home), away: toNumber(row?.away) }
  }

  statistics.possession = pair('Ball Possession')
  const shotsTotal = pair('Shots Total')
  const onTarget = pair('Shots On Goal')
  const offTarget = pair('Shots Off Goal')
  const blocked = pair('Shots Blocked')
  statistics.shots = {
    home: { total: shotsTotal.home, onTarget: onTarget.home, offTarget: offTarget.home, blocked: blocked.home },
    away: { total: shotsTotal.away, onTarget: onTarget.away, offTarget: offTarget.away, blocked: blocked.away },
  }
  statistics.corners = pair('Corners')
  statistics.fouls = pair('Fouls')
  statistics.offsides = pair('Offsides')

  // Card counts: from the statistics when present, else counted from the cards
  const countCards = (red: boolean) => {
    const cards = (fixture.cards ?? []).filter((card) => /red/i.test(card.card) === red)
    return {
      home: cards.filter((card) => card.homeFault).length,
      away: cards.filter((card) => !card.homeFault).length,
    }
  }
  statistics.yellowCards = byType.has('Yellow Cards') ? pair('Yellow Cards') : countCards(false)
  statistics.redCards = byType.has('Red Cards') ? pair('Red Cards') : countCards(true)

  const passesTotal = pair('Passes Total')
  const passesAccurate = pair('Passes Accurate')
  const percentage = (accurate: number | null, total: number | null) =>
    accurate !== null && total ? Math.round((accurate / total) * 100) : null
  statistics.passes = {
    home: {
      total: passesTotal.home,
      accurate: passesAccurate.home,
      percentage: percentage(passesAccurate.home, passesTotal.home),
    },
    away: {
      total: passesTotal.away,
      accurate: passesAccurate.away,
      percentage: percentage(passesAccurate.away, passesTotal.away),
    },
  }

  return statistics
}

export function mapFixtureDetails(fixture: GoalApiFixtureDetails): MatchDetails {
  return {
    ...mapFixture(fixture),
    events: mapEvents(fixture),
    statistics: mapStatistics(fixture),
    referee: fixture.matchReferee,
  }
}
