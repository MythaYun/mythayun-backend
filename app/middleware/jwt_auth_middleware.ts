import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'
import env from '#start/env'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'

/**
 * JWT Auth middleware for API endpoints
 * Validates Bearer tokens and sets the authenticated user
 */
export default class JwtAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Log request path for debugging
    logger.debug(`JWT Auth Middleware - Processing request for path: ${ctx.request.url()}`)

    const authHeader = ctx.request.header('authorization')
    
    if (!authHeader) {
      logger.debug('JWT Auth Middleware - No authorization header found')
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'No authorization header found'
      })
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      logger.debug(`JWT Auth Middleware - Invalid authorization format: ${authHeader.substring(0, 15)}...`)
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'Authorization header must start with Bearer'
      })
    }

    const token = authHeader.substring(7)
    logger.debug(`JWT Auth Middleware - Token received, length: ${token.length}`)
    
    try {
      // Get JWT secret for verification - Always use JWT_SECRET if available
      const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
      logger.debug(`JWT Auth Middleware - Using secret from: ${env.get('JWT_SECRET') ? 'JWT_SECRET' : 'APP_KEY'}`)
      logger.debug(`JWT Auth Middleware - Secret first 8 chars: ${jwtSecret.substring(0, 8)}...`)
      
      const payload = jwt.verify(token, jwtSecret) as any
      logger.debug(`JWT Auth Middleware - Token verified successfully, payload: ${JSON.stringify({userId: payload.userId, type: payload.type})}`)
      
      if (payload.type !== 'access') {
        logger.debug(`JWT Auth Middleware - Invalid token type: ${payload.type}, expected: access`)
        return ctx.response.status(401).json({
          error: 'Not authenticated',
          details: 'Invalid token type'
        })
      }
      
      const user = await User.find(payload.userId)
      if (!user) {
        logger.debug(`JWT Auth Middleware - User not found for userId: ${payload.userId}`)
        return ctx.response.status(401).json({
          error: 'Not authenticated',
          details: 'User not found'
        })
      }
      
      logger.debug(`JWT Auth Middleware - User found: ${user.id}, email: ${user.email}`)
      
      // Store the authenticated user in the request for middleware/controller use
      // In AdonisJS v6, auth.user is a getter only and cannot be directly set
      // Store in a custom property that controllers can access
      ;(ctx.request as any).authenticatedUser = user
      
      // Also store in other locations for backward compatibility
      ;(ctx as any).authenticatedUser = user
      
      logger.debug(`JWT Auth Middleware - Authentication successful for user: ${user.id}`)
      
      return next()
    } catch (error) {
      logger.debug(`JWT Auth Middleware - Token verification failed: ${error.message}`)
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'Invalid or expired token'
      })
    }
  }
}
