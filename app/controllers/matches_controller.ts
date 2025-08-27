import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import FootballApiClient from '#services/football_api_client'
import FootballDataMapper from '#services/football_data_mapper'


export default class MatchesController {
  private footballApi = new FootballApiClient()

  async show({ params, response }: HttpContext) {
    const matchId = params.id

    // Mock data for fast frontend development
    if (env.get('MOCK_API') === true) {
      return response.json({
        id: matchId,
        startTime: '2025-08-09T16:30:00Z',
        status: 'LIVE',
        minute: 73,
        phase: 'SECOND_HALF',
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
          home: 2,
          away: 1
        },
        venue: {
          id: 'emirates',
          name: 'Emirates Stadium',
          city: 'London'
        },
        events: [
          {
            id: 'event-1',
            ts: '2025-08-09T16:45:00Z',
            type: 'GOAL',
            minute: 15,
            teamId: 'arsenal',
            playerName: 'Bukayo Saka',
            detail: 'Right footed shot from the centre of the box'
          },
          {
            id: 'event-2',
            ts: '2025-08-09T17:15:00Z',
            type: 'GOAL',
            minute: 45,
            teamId: 'chelsea',
            playerName: 'Cole Palmer',
            detail: 'Penalty'
          },
          {
            id: 'event-3',
            ts: '2025-08-09T17:43:00Z',
            type: 'GOAL',
            minute: 73,
            teamId: 'arsenal',
            playerName: 'Martin Ødegaard',
            detail: 'Left footed shot from outside the box'
          }
        ]
      })
    }

    try {
      // Get match details from API
      const fixtures = await this.footballApi.getFixtureById(matchId)
      
      if (!fixtures || fixtures.length === 0) {
        return response.status(404).json({
          error: {
            code: 'MATCH_NOT_FOUND',
            message: 'Match not found'
          }
        })
      }

      const fixture = fixtures[0]
      
      // Get match events and advanced statistics in parallel for optimal performance
      const [events, statistics] = await Promise.all([
        this.footballApi.getFixtureEvents(matchId),
        this.footballApi.getFixtureStatistics(matchId)
      ])

      // Transform to our format
      const matchData = {
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
          shortName: fixture.teams.home.name.substring(0, 3).toUpperCase(),
          logoUrl: fixture.teams.home.logo
        },
        awayTeam: {
          id: fixture.teams.away.id.toString(),
          name: fixture.teams.away.name,
          shortName: fixture.teams.away.name.substring(0, 3).toUpperCase(),
          logoUrl: fixture.teams.away.logo
        },
        score: {
          home: fixture.goals.home,
          away: fixture.goals.away
        },
        venue: fixture.fixture.venue.name ? {
          id: fixture.fixture.venue.id?.toString(),
          name: fixture.fixture.venue.name,
          city: fixture.fixture.venue.city
        } : null,
        events: events.map(event => ({
          id: `${matchId}-${event.time.elapsed}-${event.type}`,
          ts: fixture.fixture.date, // This would need proper timestamp calculation
          type: event.type.toUpperCase(),
          minute: event.time.elapsed,
          teamId: event.team.id.toString(),
          playerName: event.player.name,
          detail: event.detail
        })),
        // Advanced match statistics - crucial for rich user experience
        statistics: FootballDataMapper.mapStatisticsResponse(statistics)
      }

      return response.json(matchData)
    } catch (error) {
      return response.status(500).json({
        error: {
          code: 'MATCH_ERROR',
          message: 'Failed to fetch match details'
        }
      })
    }
  }

  private getPhaseFromStatus(status: string, _elapsed: number | null): string {
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
      default:
        return 'UNKNOWN'
    }
  }
}
