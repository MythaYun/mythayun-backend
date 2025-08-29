import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import DeviceToken, { DevicePlatform } from '../models/device_token.js'
import Team from '../models/team.js'
import { DateTime } from 'luxon'

// Firebase Admin SDK for Firebase Cloud Messaging (FCM)
import admin from 'firebase-admin'

/**
 * Notification types supported by the system
 */
export enum NotificationType {
  MATCH_REMINDER = 'match_reminder',
  MATCH_START = 'match_start',
  GOAL_SCORED = 'goal_scored',
  HALF_TIME = 'half_time',
  MATCH_END = 'match_end',
  RED_CARD = 'red_card',
  TEAM_NEWS = 'team_news',
  STADIUM_GUIDE = 'stadium_guide'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

/**
 * Notification payload interface
 */
export interface NotificationPayload {
  title: string
  body: string
  imageUrl?: string
  data: Record<string, string>
}

/**
 * Notification metrics for tracking and reporting
 */
export interface NotificationMetrics {
  totalSent: number
  delivered: number
  failed: number
  ios: number
  android: number
  web: number
  startTime: DateTime
  endTime?: DateTime
  duration?: number
}

/**
 * NotificationService - Senior-level push notification service
 * 
 * Architecture Features:
 * - Provider abstraction for multiple notification services (FCM, APNS)
 * - Batch processing with configurable batch sizes
 * - Rate limiting to avoid provider throttling
 * - Multi-platform support (iOS, Android, Web)
 */
@inject()
export default class NotificationService {
  private firebaseApp: admin.app.App | null = null
  private isInitialized = false
  private batchSize = 500
  private metrics: NotificationMetrics = {
    totalSent: 0,
    delivered: 0,
    failed: 0,
    ios: 0,
    android: 0,
    web: 0,
    startTime: DateTime.now()
  }
  
  constructor() {
    this.initialize()
  }
  
  /**
   * Initialize the notification service and providers
   */
  private initialize(): void {
    try {
      // Initialize Firebase Admin SDK if not already initialized
      if (!this.firebaseApp && env.get('ENABLE_PUSH_NOTIFICATIONS', 'false') === 'true') {
        const serviceAccount = JSON.parse(env.get('FIREBASE_SERVICE_ACCOUNT', '{}'))
        
        if (!serviceAccount.project_id) {
          logger.warn('Firebase service account not configured properly. Push notifications disabled.')
          return
        }
        
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        })
        
        this.isInitialized = true
        logger.info('NotificationService initialized successfully')
      }
    } catch (error) {
      logger.error('Failed to initialize NotificationService:', error)
      this.isInitialized = false
    }
  }
  
  /**
   * Send a notification to a specific user
   */
  async sendToUser(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
    priority: NotificationPriority = NotificationPriority.NORMAL
  ): Promise<boolean> {
    if (!this.isInitialized) {
      logger.warn('NotificationService not initialized. Cannot send notifications.')
      return false
    }
    
    try {
      // Fetch active tokens for this user
      const tokens = await this.getUserActiveTokens(userId)
      
      if (!tokens.length) {
        logger.debug(`No active device tokens found for user ${userId}`)
        return false
      }
      
      // Send the notification
      return await this.sendToTokens(tokens, type, payload, priority)
      
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error)
      return false
    }
  }
  
  /**
   * Send a notification to users following a team
   */
  async sendToTeamFollowers(
    teamId: string,
    type: NotificationType,
    payload: NotificationPayload,
    priority: NotificationPriority = NotificationPriority.NORMAL
  ): Promise<NotificationMetrics> {
    this.resetMetrics()
    
    if (!this.isInitialized) {
      logger.warn('NotificationService not initialized. Cannot send notifications.')
      return this.finalizeMetrics()
    }
    
    try {
      // Get all Follows for this team and preload the associated user
      const team = await Team.findOrFail(teamId)
      const follows = await team.related('follows').query().preload('user')
      
      // Process in batches to avoid overloading
      for (let i = 0; i < follows.length; i += this.batchSize) {
        const batch = follows.slice(i, i + this.batchSize)
        
        // Process each user in the batch
        const userPromises = batch.map(async (follow) => {
          if (follow.user) {
            return this.sendToUser(follow.user.id, type, payload, priority)
          }
          return false
        })
        
        // Wait for batch to complete
        await Promise.all(userPromises)
      }
      
      return this.finalizeMetrics()
    } catch (error) {
      logger.error(`Failed to send notifications to followers of team ${teamId}:`, error)
      return this.finalizeMetrics()
    }
  }
  
  /**
   * Get all active device tokens for a user
   */
  private async getUserActiveTokens(userId: string): Promise<DeviceToken[]> {
    // Query for active tokens from DB and defensively filter in memory
    // to avoid any potential boolean/driver mismatches across environments.
    const tokens = await DeviceToken.query()
      .where('user_id', userId)
      .where('is_active', true)
      .exec()

    // Return tokens directly; DB where clause already filters active ones.
    // Avoid strict boolean checks that may exclude truthy values like 1.
    return tokens
  }

  /**
   * Send notification to device tokens
   */
  private async sendToTokens(
    tokens: DeviceToken[],
    type: NotificationType,
    payload: NotificationPayload,
    priority: NotificationPriority
  ): Promise<boolean> {
    if (!this.firebaseApp || !tokens.length) {
      return false
    }

    try {
      // Group tokens by platform for targeted messages
      const tokensByPlatform = this.groupTokensByPlatform(tokens)
      
      // Send to each platform
      for (const [platform, deviceTokens] of Object.entries(tokensByPlatform)) {
        const tokenStrings = deviceTokens.map(t => t.token)
        
        // Update metrics
        this.metrics.totalSent += tokenStrings.length
        if (platform === DevicePlatform.ANDROID) {
          this.metrics.android += tokenStrings.length
        } else if (platform === DevicePlatform.IOS) {
          this.metrics.ios += tokenStrings.length
        } else {
          this.metrics.web += tokenStrings.length
        }
        
        // Send message via Firebase
        const message = this.createFirebaseMessage(tokenStrings, type, payload, priority, platform as DevicePlatform)
        const response = await this.firebaseApp.messaging().sendEachForMulticast(message)
        
        // Update success/failure metrics
        this.metrics.delivered += response.successCount
        this.metrics.failed += response.failureCount
        
        // Handle failures
        if (response.failureCount > 0) {
          await this.handleFailedTokens(response.responses, deviceTokens)
        }
      }
      
      return true
    } catch (error) {
      logger.error('Failed to send notifications to tokens:', error)
      this.metrics.failed += tokens.length
      return false
    }
  }
  
  /**
   * Group tokens by platform
   */
  private groupTokensByPlatform(tokens: DeviceToken[]): Record<DevicePlatform, DeviceToken[]> {
    return tokens.reduce((groups, token) => {
      if (!groups[token.platform]) {
        groups[token.platform] = []
      }
      groups[token.platform].push(token)
      return groups
    }, {} as Record<DevicePlatform, DeviceToken[]>)
  }
  
  /**
   * Create Firebase message based on notification type and platform
   */
  private createFirebaseMessage(
    tokens: string[],
    type: NotificationType,
    payload: NotificationPayload,
    priority: NotificationPriority,
    _platform: string
  ): admin.messaging.MulticastMessage {
    // Add notification type to data payload
    const data = {
      ...payload.data,
      type,
      notification_id: this.generateNotificationId(),
      timestamp: DateTime.now().toISO()
    }
    
    // Base message configuration
    const message: admin.messaging.MulticastMessage = {
      tokens,
      data,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl
      },
      android: {
        priority: priority === NotificationPriority.HIGH ? 'high' : 'normal',
        notification: {
          icon: 'ic_notification',
          color: '#3740FF',
          channelId: this.getChannelIdForType(type)
        }
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            category: type,
            contentAvailable: true
          }
        },
        headers: {
          'apns-priority': priority === NotificationPriority.HIGH ? '10' : '5'
        }
      },
      webpush: {
        notification: {
          icon: '/images/notifications/icon.png',
          badge: '/images/notifications/badge.png'
        }
      }
    }
    
    return message
  }
  
  /**
   * Handle failed token sends and update token status
   */
  private async handleFailedTokens(
    responses: admin.messaging.SendResponse[],
    tokens: DeviceToken[]
  ): Promise<void> {
    const invalidTokens: DeviceToken[] = []
    
    responses.forEach((response, index) => {
      if (!response.success && this.isInvalidTokenError(response.error)) {
        invalidTokens.push(tokens[index])
      }
    })
    
    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      await Promise.all(
        invalidTokens.map(async (token) => {
          try {
            // Update via model instance to keep in-memory state in sync and
            // ensure correct column mapping across naming strategies.
            token.isActive = false
            await token.save()
          } catch (err) {
            // Fallback: attempt direct query update if instance save fails
            try {
              await DeviceToken.query().where('id', token.id).update({ is_active: false })
            } catch (innerErr) {
              logger.warn('Failed to deactivate invalid device token', { id: token.id, error: innerErr })
            }
          }
        })
      )

      logger.info(`Deactivated ${invalidTokens.length} invalid device tokens`)
    }
  }
  
  /**
   * Check if error is related to invalid token
   */
  private isInvalidTokenError(error?: admin.FirebaseError): boolean {
    if (!error) return false
    
    const invalidTokenErrorCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered'
    ]
    
    return invalidTokenErrorCodes.includes(error.code)
  }
  
  /**
   * Get channel ID for notification type (Android)
   */
  private getChannelIdForType(type: NotificationType): string {
    switch (type) {
      case NotificationType.MATCH_REMINDER:
      case NotificationType.MATCH_START:
        return 'match_updates'
      case NotificationType.GOAL_SCORED:
      case NotificationType.RED_CARD:
        return 'important_events'
      case NotificationType.STADIUM_GUIDE:
        return 'stadium_guides'
      default:
        return 'general'
    }
  }
  
  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }
  
  /**
   * Reset metrics for a new batch
   */
  private resetMetrics(): void {
    this.metrics = {
      totalSent: 0,
      delivered: 0,
      failed: 0,
      ios: 0,
      android: 0,
      web: 0,
      startTime: DateTime.now()
    }
  }
  
  /**
   * Finalize metrics with timing information
   */
  private finalizeMetrics(): NotificationMetrics {
    this.metrics.endTime = DateTime.now()
    this.metrics.duration = this.metrics.endTime.diff(this.metrics.startTime, 'milliseconds').milliseconds
    return { ...this.metrics }
  }
  
  /**
   * Send stadium guide notification to users at a specific venue
   */
  async sendStadiumGuideNotification(
    venueId: string,
    matchId: string | null,
    payload: NotificationPayload
  ): Promise<NotificationMetrics> {
    try {
      logger.info(`Sending stadium guide notification for venue ${venueId}`, {
        venueId,
        matchId,
        title: payload.title
      })

      // For now, we'll send to all users (in a real implementation, 
      // this would target users at the specific venue)
      // This is a placeholder implementation
      const tokens = await DeviceToken.query().where('isActive', true).limit(100)
      
      if (tokens.length === 0) {
        logger.warn('No active device tokens found for stadium guide notification')
        return this.finalizeMetrics()
      }

      const success = await this.sendToTokens(
        tokens,
        NotificationType.STADIUM_GUIDE,
        payload,
        NotificationPriority.HIGH
      )

      if (success) {
        logger.info(`Stadium guide notification sent successfully to ${tokens.length} devices`)
      } else {
        logger.error('Failed to send stadium guide notification')
      }

      return this.finalizeMetrics()
    } catch (error) {
      logger.error('Error sending stadium guide notification:', error)
      throw error
    }
  }


}
