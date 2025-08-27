import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import NotificationService, { NotificationType, NotificationPayload, NotificationPriority } from '../services/notification_service.js'
import DeviceToken, { DevicePlatform } from '../models/device_token.js'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'

/**
 * Controller for handling push notification operations
 * 
 * This controller provides endpoints for:
 * 1. Registering device tokens
 * 2. Managing notification preferences 
 * 3. Admin-only endpoints for sending notifications
 */
@inject()
export default class NotificationsController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Register a device token for push notifications
   */
  async registerDevice({ request, auth, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Authentication required' })
    }

    // Validate request data
    const tokenSchema = vine.object({
      token: vine.string().minLength(10).maxLength(512),
      platform: vine.enum(Object.values(DevicePlatform)),
      deviceModel: vine.string().maxLength(100).optional(),
      appVersion: vine.string().maxLength(20).optional()
    })

    try {
      const { token, platform, deviceModel, appVersion } = await vine.validate({ schema: tokenSchema, data: request.all() })

      // Check if token already exists
      const existingToken = await DeviceToken.query()
        .where('token', token)
        .first()

      if (existingToken) {
        // Update existing token
        existingToken.userId = user.id
        existingToken.platform = platform as DevicePlatform
        existingToken.deviceModel = deviceModel || existingToken.deviceModel
        existingToken.appVersion = appVersion || existingToken.appVersion
        existingToken.isActive = true
        existingToken.lastUsed = DateTime.now()
        await existingToken.save()

        return response.ok({ 
          message: 'Device token updated',
          tokenId: existingToken.id 
        })
      }

      // Create new device token
      const deviceToken = await DeviceToken.create({
        userId: user.id,
        token,
        platform: platform as DevicePlatform,
        deviceModel: deviceModel || null,
        appVersion: appVersion || null,
        isActive: true,
        lastUsed: DateTime.now()
      })

      return response.created({ 
        message: 'Device registered successfully', 
        tokenId: deviceToken.id 
      })
    } catch (error) {
      logger.error('Failed to register device:', error)
      return response.badRequest({ error: 'Invalid device registration data' })
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDevice({ request, auth, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Authentication required' })
    }

    const { token } = request.body()

    if (!token) {
      return response.badRequest({ error: 'Device token is required' })
    }

    try {
      // Find and deactivate token
      const deviceToken = await DeviceToken.query()
        .where('token', token)
        .where('user_id', user.id)
        .first()

      if (!deviceToken) {
        return response.notFound({ error: 'Device token not found' })
      }

      deviceToken.isActive = false
      await deviceToken.save()

      return response.ok({ message: 'Device unregistered successfully' })
    } catch (error) {
      logger.error('Failed to unregister device:', error)
      return response.internalServerError({ error: 'Failed to unregister device' })
    }
  }

  /**
   * List user's registered devices
   */
  async listDevices({ auth, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Authentication required' })
    }

    try {
      const devices = await DeviceToken.query()
        .where('user_id', user.id)
        .where('is_active', true)
        .orderBy('last_used', 'desc')

      return response.ok({
        devices: devices.map(d => ({
          id: d.id,
          platform: d.platform,
          deviceModel: d.deviceModel,
          appVersion: d.appVersion,
          lastUsed: d.lastUsed
        }))
      })
    } catch (error) {
      logger.error('Failed to list user devices:', error)
      return response.internalServerError({ error: 'Failed to retrieve devices' })
    }
  }

  /**
   * Send test notification to user's devices
   * Used for testing and troubleshooting notifications
   */
  async sendTestNotification({ auth, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Authentication required' })
    }

    try {
      const payload: NotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification from Mythayun',
        data: {
          action: 'test',
          timestamp: DateTime.now().toISO()
        }
      }

      const result = await this.notificationService.sendToUser(
        user.id,
        NotificationType.TEAM_NEWS,
        payload,
        NotificationPriority.NORMAL
      )

      if (result) {
        return response.ok({ message: 'Test notification sent' })
      } else {
        return response.badRequest({ 
          error: 'Failed to send notification. Check that you have registered devices.' 
        })
      }
    } catch (error) {
      logger.error('Failed to send test notification:', error)
      return response.internalServerError({ error: 'Failed to send test notification' })
    }
  }

  /**
   * [ADMIN] Send notification to users following a team
   * Admin-only endpoint
   */
  async sendTeamNotification({ request, auth, response }: HttpContext) {
    // Check admin permission
    if (!auth.user?.isAdmin) {
      return response.forbidden({ error: 'Admin privileges required' })
    }

    // Validate request data
    const notificationSchema = vine.object({
      teamId: vine.string(),
      title: vine.string().maxLength(100),
      body: vine.string().maxLength(200),
      type: vine.enum(Object.values(NotificationType)),
      priority: vine.enum(Object.values(NotificationPriority)).optional(),
      imageUrl: vine.string().url().optional(),
      data: vine.object({}).optional()
    })

    try {
      const { 
        teamId, title, body, type, priority = NotificationPriority.NORMAL, imageUrl, data = {} 
      } = await vine.validate({ schema: notificationSchema, data: request.all() })

      const payload: NotificationPayload = {
        title,
        body,
        imageUrl,
        data: typeof data === 'object' ? 
          // Convert all values to strings for FCM compatibility
          Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ) : {}
      }

      // Send notification
      const metrics = await this.notificationService.sendToTeamFollowers(
        teamId,
        type as NotificationType,
        payload,
        priority as NotificationPriority
      )

      return response.ok({ 
        message: 'Notifications dispatched',
        metrics: {
          totalSent: metrics.totalSent,
          delivered: metrics.delivered,
          failed: metrics.failed,
          platforms: {
            ios: metrics.ios,
            android: metrics.android,
            web: metrics.web
          },
          durationMs: metrics.duration
        }
      })
    } catch (error) {
      logger.error('Failed to send team notification:', error)
      return response.badRequest({ 
        error: 'Invalid notification data or team not found' 
      })
    }
  }

  /**
   * [ADMIN] Send stadium guide notification
   * Admin-only endpoint
   */
  async sendStadiumGuideNotification({ request, auth, response }: HttpContext) {
    // Check admin permission
    if (!auth.user?.isAdmin) {
      return response.forbidden({ error: 'Admin privileges required' })
    }

    // Validate request data
    const notificationSchema = vine.object({
      venueId: vine.string(),
      matchId: vine.string().optional(),
      title: vine.string().maxLength(100),
      body: vine.string().maxLength(200),
      imageUrl: vine.string().url().optional(),
      data: vine.object({}).optional()
    })

    try {
      const { 
        venueId, matchId, title, body, imageUrl, data = {} 
      } = await vine.validate({ schema: notificationSchema, data: request.all() })

      const payload: NotificationPayload = {
        title,
        body,
        imageUrl,
        data: typeof data === 'object' ? 
          // Convert all values to strings for FCM compatibility
          Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ) : {}
      }

      // Add venue id to data payload
      payload.data.venueId = venueId

      // Send notification
      const metrics = await this.notificationService.sendStadiumGuideNotification(
        venueId,
        matchId || null,
        payload
      )

      return response.ok({ 
        message: 'Stadium guide notifications dispatched',
        metrics: {
          totalSent: metrics.totalSent,
          delivered: metrics.delivered,
          failed: metrics.failed,
          platforms: {
            ios: metrics.ios,
            android: metrics.android,
            web: metrics.web
          },
          durationMs: metrics.duration
        }
      })
    } catch (error) {
      logger.error('Failed to send stadium guide notification:', error)
      return response.badRequest({ 
        error: 'Invalid notification data or venue not found' 
      })
    }
  }
}
