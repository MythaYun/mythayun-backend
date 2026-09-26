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
    const authHeader = ctx.request.header('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'Missing or malformed authorization header'
      })
    }

    const token = authHeader.substring(7)

    let payload: any
    try {
      payload = jwt.verify(token, env.get('JWT_SECRET'), { algorithms: ['HS256'] })
    } catch (error) {
      logger.debug(`JWT verification failed: ${error.message}`)
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'Invalid or expired token'
      })
    }

    if (payload.type !== 'access') {
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'Invalid token type'
      })
    }

    const user = await User.find(payload.userId)
    // Suspended (incl. deleted) accounts lose access even with an unexpired token.
    // 'locked' is a temporary login-throttle state and doesn't end existing sessions.
    if (!user || user.accountStatus === 'suspended') {
      return ctx.response.status(401).json({
        error: 'Not authenticated',
        details: 'Invalid or expired token'
      })
    }

    // In AdonisJS v6, auth.user is a getter only and cannot be directly set
    ;(ctx.request as any).authenticatedUser = user
    ;(ctx as any).authenticatedUser = user

    return next()
  }
}
