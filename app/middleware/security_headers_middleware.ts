import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * Baseline security headers for a JSON API.
 */
export default class SecurityHeadersMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { response } = ctx

    response.header('X-Content-Type-Options', 'nosniff')
    response.header('X-Frame-Options', 'DENY')
    response.header('Referrer-Policy', 'no-referrer')
    // The API only returns JSON, so it never needs to load or run anything
    response.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    response.header('Cross-Origin-Resource-Policy', 'cross-origin')

    if (app.inProduction) {
      response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    return next()
  }
}
