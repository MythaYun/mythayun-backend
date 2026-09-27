import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { getFootballProvider } from '#services/football_provider'

export default class MatchesController {
  async show({ params, response }: HttpContext) {
    const matchId = params.id

    // Mock data for fast frontend development
    if (env.get('MOCK_API', 'false') === 'true') {
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
      const provider = await getFootballProvider()
      const match = await provider.getMatchDetails(String(matchId))

      if (!match) {
        return response.status(404).json({
          error: {
            code: 'MATCH_NOT_FOUND',
            message: 'Match not found'
          }
        })
      }

      return response.json(match)
    } catch (error) {
      return response.status(500).json({
        error: {
          code: 'MATCH_ERROR',
          message: 'Failed to fetch match details'
        }
      })
    }
  }
}
