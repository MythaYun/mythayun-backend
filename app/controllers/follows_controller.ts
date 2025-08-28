import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import FollowsService from '#services/follows_service'
import vine from '@vinejs/vine'

/**
 * FollowsController - Senior-level follows management endpoints
 * 
 * Provides comprehensive follows functionality:
 * - Follow/unfollow teams, leagues, and matches
 * - Manage notification preferences per follow
 * - Get follow statistics and recommendations
 * - Bulk follow operations for onboarding
 * - Follow activity and analytics
 * 
 * Features:
 * - Granular notification controls
 * - Follow limits and spam prevention
 * - Privacy controls and follow requests
 * - Real-time follow updates via WebSocket
 */
export default class FollowsController {
  private followsService = new FollowsService()

  /**
   * Follow a team, league, or match
   */
  async follow({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      // Validate follow request
      const followSchema = vine.object({
        entityType: vine.enum(['team', 'league', 'match']),
        entityId: vine.string().minLength(1),
        notificationPreferences: vine.object({
          goals: vine.boolean().optional(),
          cards: vine.boolean().optional(),
          substitutions: vine.boolean().optional(),
          matchStart: vine.boolean().optional(),
          matchEnd: vine.boolean().optional(),
          lineups: vine.boolean().optional()
        }).optional()
      })

      const data = await vine.validate({
        schema: followSchema,
        data: request.body()
      })

      // Create follow
      const follow = await this.followsService.followEntity({
        userId: user.id,
        ...data
      })

      return response.status(201).json({
        message: `Successfully followed ${data.entityType}`,
        follow: {
          id: follow.id,
          entityType: follow.entityType,
          entityId: follow.entityId,
          notificationPreferences: follow.notificationPreferences,
          createdAt: follow.createdAt
        }
      })

    } catch (error) {
      logger.error('Follow failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(400).json({
        error: 'Follow failed',
        message: error.message
      })
    }
  }

  /**
   * Unfollow a team, league, or match
   */
  async unfollow({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      // Validate unfollow request
      const unfollowSchema = vine.object({
        entityType: vine.enum(['team', 'league', 'match']),
        entityId: vine.string().minLength(1)
      })

      const { entityType, entityId } = await vine.validate({
        schema: unfollowSchema,
        data: request.body()
      })

      // Remove follow
      await this.followsService.unfollowEntity(user.id, entityType, entityId)

      return response.json({
        message: `Successfully unfollowed ${entityType}`
      })

    } catch (error) {
      logger.error('Unfollow failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(400).json({
        error: 'Unfollow failed',
        message: error.message
      })
    }
  }

  /**
   * Get user's follows
   */
  async getUserFollows({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      const { entityType, page, limit } = request.qs()

      const result = await this.followsService.getUserFollows(user.id, {
        entityType,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      })

      return response.json({
        follows: result.follows.map(follow => ({
          id: follow.id,
          entityType: follow.entityType,
          entityId: follow.entityId,
          notificationPreferences: follow.notificationPreferences,
          createdAt: follow.createdAt,
          // Include entity details if preloaded
          entity: this.getEntityDetails(follow)
        })),
        pagination: result.pagination
      })

    } catch (error) {
      logger.error('Get user follows failed:', error)
      
      return response.status(500).json({
        error: 'Failed to get follows'
      })
    }
  }

  /**
   * Get follow statistics for user
   */
  async getFollowStats({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      const stats = await this.followsService.getUserFollowStats(user.id)

      return response.json({
        stats
      })

    } catch (error) {
      logger.error('Get follow stats failed:', error)
      
      return response.status(500).json({
        error: 'Failed to get follow statistics'
      })
    }
  }

  /**
   * Get follow recommendations
   */
  async getRecommendations({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      const { limit } = request.qs()
      const recommendations = await this.followsService.getFollowRecommendations(
        user.id, 
        limit ? parseInt(limit) : 10
      )

      return response.json({
        recommendations
      })

    } catch (error) {
      logger.error('Get recommendations failed:', error)
      
      return response.status(500).json({
        error: 'Failed to get recommendations'
      })
    }
  }

  /**
   * Update notification preferences for a follow
   */
  async updateNotificationPreferences({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      // Validate update request
      const updateSchema = vine.object({
        entityType: vine.enum(['team', 'league', 'match']),
        entityId: vine.string().minLength(1),
        preferences: vine.object({
          goals: vine.boolean().optional(),
          cards: vine.boolean().optional(),
          substitutions: vine.boolean().optional(),
          matchStart: vine.boolean().optional(),
          matchEnd: vine.boolean().optional(),
          lineups: vine.boolean().optional()
        })
      })

      const { entityType, entityId, preferences } = await vine.validate({
        schema: updateSchema,
        data: request.body()
      })

      // Update preferences
      const follow = await this.followsService.updateNotificationPreferences(
        user.id, 
        entityType, 
        entityId, 
        preferences
      )

      return response.json({
        message: 'Notification preferences updated successfully',
        follow: {
          id: follow.id,
          notificationPreferences: follow.notificationPreferences,
          updatedAt: follow.updatedAt
        }
      })

    } catch (error) {
      logger.error('Update notification preferences failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(400).json({
        error: 'Failed to update notification preferences',
        message: error.message
      })
    }
  }

  /**
   * Bulk follow operation (useful for onboarding)
   */
  async bulkFollow({ request, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      // Validate bulk follow request
      const bulkSchema = vine.object({
        entities: vine.array(vine.object({
          type: vine.enum(['team', 'league', 'match']),
          id: vine.string().minLength(1)
        })).minLength(1).maxLength(20) // Limit bulk operations
      })

      const { entities } = await vine.validate({
        schema: bulkSchema,
        data: request.body()
      })

      // Perform bulk follow
      const follows = await this.followsService.bulkFollow(user.id, entities)

      return response.json({
        message: `Successfully followed ${follows.length} entities`,
        follows: follows.map(follow => ({
          id: follow.id,
          entityType: follow.entityType,
          entityId: follow.entityId,
          createdAt: follow.createdAt
        })),
        failed: entities.length - follows.length
      })

    } catch (error) {
      logger.error('Bulk follow failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(400).json({
        error: 'Bulk follow failed',
        message: error.message
      })
    }
  }

  /**
   * Get followers for an entity (public endpoint)
   */
  async getEntityFollowers({ params, request, response }: HttpContext) {
    try {
      const { entityType, entityId } = params
      const { page, limit } = request.qs()

      // Validate entity type
      if (!['team', 'league', 'match'].includes(entityType)) {
        return response.status(400).json({
          error: 'Invalid entity type'
        })
      }

      const result = await this.followsService.getEntityFollowers(entityType, entityId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      })

      return response.json({
        followers: result.followers.map(follow => ({
          id: follow.id,
          user: follow.user ? {
            id: follow.user.id,
            fullName: follow.user.fullName,
            profilePicture: follow.user.profilePicture
          } : null,
          createdAt: follow.createdAt
        })),
        pagination: result.pagination
      })

    } catch (error) {
      logger.error('Get entity followers failed:', error)
      
      return response.status(500).json({
        error: 'Failed to get followers'
      })
    }
  }

  /**
   * Check if user follows an entity
   */
  async checkFollow({ request, params, response }: HttpContext) {
    try {
      const user = (request as any).authenticatedUser
      if (!user) {
        return response.status(401).json({ error: 'Not authenticated' })
      }

      const { entityType, entityId } = params

      // Validate entity type
      if (!['team', 'league', 'match'].includes(entityType)) {
        return response.status(400).json({
          error: 'Invalid entity type'
        })
      }

      const follows = await this.followsService.getUserFollows(user.id, {
        entityType
      })

      const isFollowing = follows.follows.some(follow => follow.entityId === entityId)

      return response.json({
        isFollowing,
        entityType,
        entityId
      })

    } catch (error) {
      logger.error('Check follow failed:', error)
      
      return response.status(500).json({
        error: 'Failed to check follow status'
      })
    }
  }

  /**
   * Helper method to extract entity details from follow
   */
  private getEntityDetails(follow: any) {
    switch (follow.entityType) {
      case 'team':
        return follow.team ? {
          id: follow.team.id,
          name: follow.team.name,
          shortName: follow.team.shortName,
          logoUrl: follow.team.logoUrl
        } : null
      case 'league':
        return follow.league ? {
          id: follow.league.id,
          name: follow.league.name,
          country: follow.league.country,
          logoUrl: follow.league.logoUrl
        } : null
      case 'match':
        return follow.match ? {
          id: follow.match.id,
          homeTeamId: follow.match.homeTeamId,
          awayTeamId: follow.match.awayTeamId,
          startTime: follow.match.startTime,
          status: follow.match.status
        } : null
      default:
        return null
    }
  }
}
