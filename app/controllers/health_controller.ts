import type { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'
import User from '#models/user'

/**
 * HealthController - System health and database connectivity checks
 */
export default class HealthController {
  /**
   * Comprehensive health check including database connectivity
   */
  async index({ response }: HttpContext) {
    try {
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          api: 'healthy',
          database: 'unknown'
        },
        checks: {
          databaseConnection: false,
          databaseRead: false,
          databaseWrite: false
        }
      }

      // Test 1: Database connection
      try {
        await Database.rawQuery('SELECT 1')
        healthStatus.checks.databaseConnection = true
      } catch (error) {
        healthStatus.services.database = 'connection_failed'
        healthStatus.checks.databaseConnection = false
      }

      // Test 2: Database read operation
      try {
        await User.query().limit(1)
        healthStatus.checks.databaseRead = true
      } catch (error) {
        healthStatus.services.database = 'read_failed'
        healthStatus.checks.databaseRead = false
      }

      // Test 3: Database write operation (simple test)
      try {
        // Try to create a test record (will fail if user exists, but that's ok)
        const testEmail = `health-check-${Date.now()}@test.com`
        await User.create({
          id: `health-${Date.now()}`,
          email: testEmail,
          fullName: 'Health Check User',
          password: 'test123',
          authProvider: 'email',
          emailVerified: false,
          accountStatus: 'active'
        })
        healthStatus.checks.databaseWrite = true
        
        // Clean up the test user
        await User.query().where('email', testEmail).delete()
      } catch (error) {
        healthStatus.services.database = 'write_failed'
        healthStatus.checks.databaseWrite = false
      }

      // Set overall database status
      if (healthStatus.checks.databaseConnection && healthStatus.checks.databaseRead && healthStatus.checks.databaseWrite) {
        healthStatus.services.database = 'healthy'
      }

      return response.json(healthStatus)

    } catch (error) {
      return response.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        services: {
          api: 'unhealthy',
          database: 'error'
        }
      })
    }
  }
}
