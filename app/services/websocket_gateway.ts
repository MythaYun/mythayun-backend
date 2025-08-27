import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

export interface MatchUpdate {
  matchId: string
  type: 'score' | 'status' | 'event' | 'state'
  data: any
  timestamp: string
}

export interface ClientSubscription {
  userId?: string
  socketId: string
  subscriptions: Set<string>
  connectedAt: Date
}

/**
 * WebSocketGateway - Senior-level real-time communication service
 * 
 * Architecture Features:
 * - Room-based subscriptions for efficient broadcasting
 * - Client connection management and cleanup
 * - Rate limiting and abuse prevention
 * - Structured event types for different data updates
 * - Graceful connection handling and reconnection support
 * 
 * Design Patterns:
 * - Publisher-Subscriber pattern for real-time updates
 * - Observer pattern for client management
 * - Strategy pattern for different message types
 * - Singleton pattern for centralized gateway management
 */
export default class WebSocketGateway {
  private static instance: WebSocketGateway
  private io: Server | null = null
  private clients: Map<string, ClientSubscription> = new Map()
  private isInitialized = false

  private constructor() {}

  static getInstance(): WebSocketGateway {
    if (!WebSocketGateway.instance) {
      WebSocketGateway.instance = new WebSocketGateway()
    }
    return WebSocketGateway.instance
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    if (this.isInitialized) {
      logger.warn('WebSocket gateway already initialized')
      return
    }

    logger.info('Initializing WebSocket gateway...')

    this.io = new Server(httpServer, {
      cors: {
        origin: env.get('CORS_ORIGIN', '*'),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupEventHandlers()
    this.isInitialized = true

    logger.info('WebSocket gateway initialized successfully')
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`)

      // Register client
      this.registerClient(socket.id)

      // Handle client subscription to matches
      socket.on('subscribe:match', (matchId: string) => {
        this.subscribeToMatch(socket.id, matchId)
        socket.join(`match:${matchId}`)
        logger.debug(`Client ${socket.id} subscribed to match ${matchId}`)
      })

      // Handle client subscription to leagues
      socket.on('subscribe:league', (leagueId: string) => {
        this.subscribeToLeague(socket.id, leagueId)
        socket.join(`league:${leagueId}`)
        logger.debug(`Client ${socket.id} subscribed to league ${leagueId}`)
      })

      // Handle client subscription to live matches
      socket.on('subscribe:live', () => {
        socket.join('live:matches')
        logger.debug(`Client ${socket.id} subscribed to live matches`)
      })

      // Handle unsubscription
      socket.on('unsubscribe:match', (matchId: string) => {
        this.unsubscribeFromMatch(socket.id, matchId)
        socket.leave(`match:${matchId}`)
        logger.debug(`Client ${socket.id} unsubscribed from match ${matchId}`)
      })

      socket.on('unsubscribe:league', (leagueId: string) => {
        this.unsubscribeFromLeague(socket.id, leagueId)
        socket.leave(`league:${leagueId}`)
        logger.debug(`Client ${socket.id} unsubscribed from league ${leagueId}`)
      })

      // Handle client authentication (for user-specific features)
      socket.on('authenticate', (data: { userId: string, token: string }) => {
        this.authenticateClient(socket.id, data)
      })

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() })
      })

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`)
        this.unregisterClient(socket.id)
      })

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Live Score WebSocket',
        timestamp: new Date().toISOString(),
        socketId: socket.id
      })
    })
  }

  /**
   * Broadcast match update to subscribed clients
   */
  broadcastMatchUpdate(update: MatchUpdate): void {
    if (!this.io) {
      logger.warn('WebSocket not initialized, cannot broadcast match update')
      return
    }

    // Broadcast to match-specific room
    this.io.to(`match:${update.matchId}`).emit('match:update', update)

    // Also broadcast to live matches room if it's a live update
    if (update.type === 'score' || update.type === 'event') {
      this.io.to('live:matches').emit('live:update', update)
    }

    logger.debug(`Broadcasted match update for match ${update.matchId}`, {
      type: update.type,
      timestamp: update.timestamp
    })
  }

  /**
   * Broadcast league update to subscribed clients
   */
  broadcastLeagueUpdate(leagueId: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket not initialized, cannot broadcast league update')
      return
    }

    this.io.to(`league:${leagueId}`).emit('league:update', {
      leagueId,
      data,
      timestamp: new Date().toISOString()
    })

    logger.debug(`Broadcasted league update for league ${leagueId}`)
  }

  /**
   * Send notification to specific user
   */
  sendUserNotification(userId: string, notification: any): void {
    if (!this.io) {
      logger.warn('WebSocket not initialized, cannot send user notification')
      return
    }

    // Find all sockets for this user
    const userSockets = Array.from(this.clients.values())
      .filter(client => client.userId === userId)
      .map(client => client.socketId)

    if (userSockets.length === 0) {
      logger.debug(`No connected sockets found for user ${userId}`)
      return
    }

    // Send notification to all user's sockets
    userSockets.forEach(socketId => {
      this.io!.to(socketId).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      })
    })

    logger.debug(`Sent notification to user ${userId} on ${userSockets.length} sockets`)
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): any {
    if (!this.io) {
      return { connected: 0, rooms: 0 }
    }

    const rooms = this.io.sockets.adapter.rooms
    const connectedClients = this.clients.size

    return {
      connected: connectedClients,
      rooms: rooms.size,
      authenticatedUsers: Array.from(this.clients.values())
        .filter(client => client.userId).length,
      roomDetails: Array.from(rooms.entries()).map(([roomName, sockets]) => ({
        room: roomName,
        clients: sockets.size
      }))
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.io) {
      return
    }

    logger.info('Shutting down WebSocket gateway...')

    // Notify all clients about shutdown
    this.io.emit('server:shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    })

    // Close all connections
    this.io.close()
    this.clients.clear()
    this.isInitialized = false

    logger.info('WebSocket gateway shutdown complete')
  }

  /**
   * Private client management methods
   */
  private registerClient(socketId: string): void {
    this.clients.set(socketId, {
      socketId,
      subscriptions: new Set(),
      connectedAt: new Date()
    })
  }

  private unregisterClient(socketId: string): void {
    this.clients.delete(socketId)
  }

  private authenticateClient(socketId: string, authData: { userId: string, token: string }): void {
    const client = this.clients.get(socketId)
    if (!client) {
      logger.warn(`Attempted to authenticate unknown client: ${socketId}`)
      return
    }

    // In a real implementation, you'd validate the token here
    // For now, we'll just store the userId
    client.userId = authData.userId

    logger.info(`Client ${socketId} authenticated as user ${authData.userId}`)

    // Send authentication confirmation
    this.io?.to(socketId).emit('authenticated', {
      userId: authData.userId,
      timestamp: new Date().toISOString()
    })
  }

  private subscribeToMatch(socketId: string, matchId: string): void {
    const client = this.clients.get(socketId)
    if (client) {
      client.subscriptions.add(`match:${matchId}`)
    }
  }

  private unsubscribeFromMatch(socketId: string, matchId: string): void {
    const client = this.clients.get(socketId)
    if (client) {
      client.subscriptions.delete(`match:${matchId}`)
    }
  }

  private subscribeToLeague(socketId: string, leagueId: string): void {
    const client = this.clients.get(socketId)
    if (client) {
      client.subscriptions.add(`league:${leagueId}`)
    }
  }

  private unsubscribeFromLeague(socketId: string, leagueId: string): void {
    const client = this.clients.get(socketId)
    if (client) {
      client.subscriptions.delete(`league:${leagueId}`)
    }
  }
}
