import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

/**
 * Admin middleware to protect admin-only endpoints
 * This middleware should be used after JWT auth middleware
 * to ensure the authenticated user is an admin
 */
export default class AdminMiddleware {
  /**
   * Handle the incoming request
   */
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      // Get authenticated user from JWT middleware
      const user = (ctx.request as any).authenticatedUser

      // Ensure user is authenticated
      if (!user) {
        return ctx.response.status(401).json({
          error: 'Not authenticated',
          details: 'Authentication required for admin access'
        })
      }

      // Check if user has admin privileges
      if (!user.isAdmin) {
        logger.warn(`Unauthorized admin access attempt by user: ${user.id}, email: ${user.email}`)
        return ctx.response.status(403).json({
          error: 'Access forbidden',
          details: 'Admin privileges required'
        })
      }

      // User is authenticated and has admin privileges
      logger.debug(`Admin access granted for user: ${user.id}`)

      // Continue to the route handler
      await next()
    } catch (error) {
      logger.error('Admin middleware error:', error)
      return ctx.response.status(500).json({
        error: 'Server error',
        details: 'An error occurred while processing your request'
      })
    }
  }
}
