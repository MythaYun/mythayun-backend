import type { FixtureResponse, EventResponse, StatisticsResponse } from '#services/football_api_client'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'

export interface MappedFixture {
  id: string
  startTime: string
  status: string
  minute?: number | null
  phase: string
  league: {
    id: string
    name: string
    country: string
  }
  homeTeam: {
    id: string
    name: string
    shortName: string
    logoUrl: string
  }
  awayTeam: {
    id: string
    name: string
    shortName: string
    logoUrl: string
  }
  score: {
    home: number | null
    away: number | null
  }
  venue?: {
    id: string | null
    name: string | null
    city: string | null
  } | null
}

export interface MappedEvent {
  id: string
  ts: string
  type: string
  minute: number
  teamId: string
  playerName: string | null
  detail: string
}

export interface MappedStatistics {
  possession: {
    home: number | null
    away: number | null
  }
  shots: {
    home: {
      total: number | null
      onTarget: number | null
      offTarget: number | null
      blocked: number | null
    }
    away: {
      total: number | null
      onTarget: number | null
      offTarget: number | null
      blocked: number | null
    }
  }
  corners: {
    home: number | null
    away: number | null
  }
  fouls: {
    home: number | null
    away: number | null
  }
  yellowCards: {
    home: number | null
    away: number | null
  }
  redCards: {
    home: number | null
    away: number | null
  }
  offsides: {
    home: number | null
    away: number | null
  }
  passes: {
    home: {
      total: number | null
      accurate: number | null
      percentage: number | null
    }
    away: {
      total: number | null
      accurate: number | null
      percentage: number | null
    }
  }
}

export default class FootballDataMapper {
  static mapFixtureToResponse(fixture: FixtureResponse): MappedFixture {
    return {
      id: fixture.fixture.id.toString(),
      startTime: fixture.fixture.date,
      status: fixture.fixture.status.short,
      minute: fixture.fixture.status.elapsed,
      phase: this.getPhaseFromStatus(fixture.fixture.status.short, fixture.fixture.status.elapsed),
      league: {
        id: fixture.league.id.toString(),
        name: fixture.league.name,
        country: fixture.league.country
      },
      homeTeam: {
        id: fixture.teams.home.id.toString(),
        name: fixture.teams.home.name,
        shortName: this.generateShortName(fixture.teams.home.name),
        logoUrl: fixture.teams.home.logo
      },
      awayTeam: {
        id: fixture.teams.away.id.toString(),
        name: fixture.teams.away.name,
        shortName: this.generateShortName(fixture.teams.away.name),
        logoUrl: fixture.teams.away.logo
      },
      score: {
        home: fixture.goals.home,
        away: fixture.goals.away
      },
      venue: fixture.fixture.venue.name ? {
        id: fixture.fixture.venue.id?.toString() || null,
        name: fixture.fixture.venue.name,
        city: fixture.fixture.venue.city
      } : null
    }
  }

  static mapEventToResponse(event: EventResponse, matchId: string): MappedEvent {
    return {
      id: `${matchId}-${event.time.elapsed}-${event.type}-${Date.now()}`,
      ts: new Date().toISOString(), // This would need proper timestamp calculation in production
      type: event.type.toUpperCase(),
      minute: event.time.elapsed,
      teamId: event.team.id.toString(),
      playerName: event.player.name,
      detail: event.detail
    }
  }

  static mapFixtureToMatch(fixture: FixtureResponse) {
    return {
      id: fixture.fixture.id.toString(),
      leagueId: fixture.league.id.toString(),
      season: fixture.league.season,
      homeTeamId: fixture.teams.home.id.toString(),
      awayTeamId: fixture.teams.away.id.toString(),
      venueId: fixture.fixture.venue.id?.toString() || null,
      startTime: DateTime.fromISO(fixture.fixture.date),
      status: fixture.fixture.status.short,
      providerIds: {
        football_api_id: fixture.fixture.id
      }
    }
  }

  static mapFixtureToMatchState(fixture: FixtureResponse) {
    return {
      matchId: fixture.fixture.id.toString(),
      minute: fixture.fixture.status.elapsed,
      phase: this.getPhaseFromStatus(fixture.fixture.status.short, fixture.fixture.status.elapsed),
      homeScore: fixture.goals.home || 0,
      awayScore: fixture.goals.away || 0,
      lastEventId: null
    }
  }

  static mapEventToMatchEvent(event: EventResponse, matchId: string) {
    return {
      id: uuidv4(),
      matchId: matchId,
      ts: DateTime.now(), // This would need proper timestamp calculation
      type: event.type.toUpperCase(),
      teamId: event.team.id.toString(),
      playerId: event.player.id?.toString() || null,
      playerName: event.player.name,
      detailJson: {
        detail: event.detail,
        comments: event.comments,
        assist: event.assist
      },
      providerEventId: `${matchId}-${event.time.elapsed}-${event.type}-${event.team.id}`
    }
  }

  static mapLeagueResponse(league: any, slug: string, season: number) {
    return {
      id: uuidv4(),
      name: league.league.name,
      country: league.country.name,
      season: season,
      logoUrl: league.league.logo,
      providerIds: {
        football_api_id: league.league.id,
        slug: slug
      }
    }
  }

  static mapTeamResponse(team: any, leagueId?: string) {
    return {
      id: team.id.toString(),
      name: team.name,
      shortName: this.generateShortName(team.name),
      logoUrl: team.logo,
      leagueId: leagueId || null,
      providerIds: {
        football_api_id: team.id
      }
    }
  }

  static mapVenueResponse(venue: any) {
    return {
      id: venue.id?.toString() || uuidv4(),
      name: venue.name,
      city: venue.city,
      capacity: venue.capacity || null,
      providerIds: {
        football_api_id: venue.id
      }
    }
  }

  private static getPhaseFromStatus(status: string, elapsed: number | null): string {
    switch (status) {
      case 'NS':
        return 'NOT_STARTED'
      case '1H':
        return 'FIRST_HALF'
      case 'HT':
        return 'HALF_TIME'
      case '2H':
        return 'SECOND_HALF'
      case 'ET':
        return 'EXTRA_TIME'
      case 'P':
        return 'PENALTY_SHOOTOUT'
      case 'FT':
        return 'FULL_TIME'
      case 'AET':
        return 'AFTER_EXTRA_TIME'
      case 'PEN':
        return 'AFTER_PENALTIES'
      case 'PST':
        return 'POSTPONED'
      case 'CANC':
        return 'CANCELLED'
      case 'ABD':
        return 'ABANDONED'
      case 'AWD':
        return 'AWARDED'
      case 'WO':
        return 'WALKOVER'
      case 'LIVE':
        return elapsed && elapsed > 45 ? 'SECOND_HALF' : 'FIRST_HALF'
      default:
        return 'UNKNOWN'
    }
  }

  /**
   * Map Football API statistics to standardized format
   * Senior-level implementation with comprehensive error handling and data normalization
   */
  static mapStatisticsResponse(statisticsData: StatisticsResponse[]): MappedStatistics {
    if (!statisticsData || statisticsData.length === 0) {
      return this.getEmptyStatistics()
    }

    const homeStats = statisticsData.find(stat => stat.team.id === statisticsData[0]?.team.id)
    const awayStats = statisticsData.find(stat => stat.team.id !== statisticsData[0]?.team.id)

    return {
      possession: {
        home: this.extractStatValue(homeStats, 'Ball Possession'),
        away: this.extractStatValue(awayStats, 'Ball Possession')
      },
      shots: {
        home: {
          total: this.extractStatValue(homeStats, 'Total Shots'),
          onTarget: this.extractStatValue(homeStats, 'Shots on Goal'),
          offTarget: this.extractStatValue(homeStats, 'Shots off Goal'),
          blocked: this.extractStatValue(homeStats, 'Blocked Shots')
        },
        away: {
          total: this.extractStatValue(awayStats, 'Total Shots'),
          onTarget: this.extractStatValue(awayStats, 'Shots on Goal'),
          offTarget: this.extractStatValue(awayStats, 'Shots off Goal'),
          blocked: this.extractStatValue(awayStats, 'Blocked Shots')
        }
      },
      corners: {
        home: this.extractStatValue(homeStats, 'Corner Kicks'),
        away: this.extractStatValue(awayStats, 'Corner Kicks')
      },
      fouls: {
        home: this.extractStatValue(homeStats, 'Fouls'),
        away: this.extractStatValue(awayStats, 'Fouls')
      },
      yellowCards: {
        home: this.extractStatValue(homeStats, 'Yellow Cards'),
        away: this.extractStatValue(awayStats, 'Yellow Cards')
      },
      redCards: {
        home: this.extractStatValue(homeStats, 'Red Cards'),
        away: this.extractStatValue(awayStats, 'Red Cards')
      },
      offsides: {
        home: this.extractStatValue(homeStats, 'Offsides'),
        away: this.extractStatValue(awayStats, 'Offsides')
      },
      passes: {
        home: {
          total: this.extractStatValue(homeStats, 'Total passes'),
          accurate: this.extractStatValue(homeStats, 'Passes accurate'),
          percentage: this.extractStatValue(homeStats, 'Passes %')
        },
        away: {
          total: this.extractStatValue(awayStats, 'Total passes'),
          accurate: this.extractStatValue(awayStats, 'Passes accurate'),
          percentage: this.extractStatValue(awayStats, 'Passes %')
        }
      }
    }
  }

  /**
   * Extract specific statistic value with type safety and normalization
   */
  private static extractStatValue(teamStats: StatisticsResponse | undefined, statType: string): number | null {
    if (!teamStats?.statistics) return null
    
    const stat = teamStats.statistics.find(s => s.type === statType)
    if (!stat?.value) return null
    
    // Handle percentage values (remove % and convert to number)
    if (typeof stat.value === 'string' && stat.value.includes('%')) {
      const numValue = parseFloat(stat.value.replace('%', ''))
      return isNaN(numValue) ? null : numValue
    }
    
    // Handle numeric values
    if (typeof stat.value === 'number') {
      return stat.value
    }
    
    // Handle string numeric values
    if (typeof stat.value === 'string') {
      const numValue = parseFloat(stat.value)
      return isNaN(numValue) ? null : numValue
    }
    
    return null
  }

  /**
   * Return empty statistics structure for fallback
   */
  private static getEmptyStatistics(): MappedStatistics {
    return {
      possession: { home: null, away: null },
      shots: {
        home: { total: null, onTarget: null, offTarget: null, blocked: null },
        away: { total: null, onTarget: null, offTarget: null, blocked: null }
      },
      corners: { home: null, away: null },
      fouls: { home: null, away: null },
      yellowCards: { home: null, away: null },
      redCards: { home: null, away: null },
      offsides: { home: null, away: null },
      passes: {
        home: { total: null, accurate: null, percentage: null },
        away: { total: null, accurate: null, percentage: null }
      }
    }
  }

  private static generateShortName(name: string): string {
    // Handle common team name patterns
    if (name.includes('FC ')) {
      return name.replace('FC ', '').substring(0, 3).toUpperCase()
    }
    if (name.includes(' FC')) {
      return name.replace(' FC', '').substring(0, 3).toUpperCase()
    }
    if (name.includes(' United')) {
      return name.replace(' United', '').substring(0, 3).toUpperCase()
    }
    if (name.includes(' City')) {
      return name.replace(' City', '').substring(0, 3).toUpperCase()
    }
    
    // Default: take first 3 characters
    return name.substring(0, 3).toUpperCase()
  }
}
