import type { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'

/**
 * HealthController - System health and database connectivity checks
 *
 * This endpoint is public, so it only runs a read-only query: it must never
 * write data or reveal internal error details.
 */
export default class HealthController {
  async index({ response }: HttpContext) {
    let databaseHealthy = false
    try {
      await Database.rawQuery('SELECT 1')
      databaseHealthy = true
    } catch {
      databaseHealthy = false
    }

    return response.status(databaseHealthy ? 200 : 503).json({
      status: databaseHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: databaseHealthy ? 'healthy' : 'unhealthy'
      }
    })
  }
}
