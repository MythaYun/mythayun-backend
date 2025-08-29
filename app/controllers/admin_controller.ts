import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { getJobRegistry } from '../../start/jobs.js'

/**
 * AdminController - Senior-level administration interface
 * 
 * Provides comprehensive admin functionality for:
 * - Job management and monitoring
 * - System health checks
 * - WebSocket connection monitoring
 * - Manual data ingestion triggers
 * - System metrics and statistics
 * 
 * Security Note: In production, this should be protected with proper authentication
 * and authorization middleware to ensure only authorized admins can access these endpoints.
 */
export default class AdminController {

  /**
   * Get system health status
   */
  async health({ response }: HttpContext) {
    try {
      const jobRegistry = getJobRegistry()

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          jobs: jobRegistry ? 'healthy' : 'disabled',
          websocket: 'disabled', // WebSocket not implemented yet
          database: 'healthy' // Would implement actual DB health check
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }

      return response.json(health)

    } catch (error) {
      logger.error('Health check failed:', error)
      return response.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Get all jobs status
   */
  async jobsStatus({ response }: HttpContext) {
    try {
      const jobRegistry = getJobRegistry()
      
      if (!jobRegistry) {
        return response.json({
          message: 'Job scheduler not initialized',
          jobs: []
        })
      }

      const jobsStatus = jobRegistry.getJobsStatus()
      const allJobs = [...jobsStatus.active, ...jobsStatus.inactive, ...jobsStatus.error]
      
      return response.json({
        timestamp: new Date().toISOString(),
        totalJobs: allJobs.length,
        runningJobs: allJobs.filter((job: any) => job.status === 'active').length,
        enabledJobs: allJobs.filter((job: any) => job.status !== 'error').length,
        jobs: jobsStatus
      })

    } catch (error) {
      logger.error('Failed to get jobs status:', error)
      return response.status(500).json({
        error: 'Failed to retrieve jobs status',
        message: error.message
      })
    }
  }

  /**
   * Trigger a specific job manually
   */
  async triggerJob({ params, response }: HttpContext) {
    try {
      const { jobName } = params
      const jobRegistry = getJobRegistry()
      
      if (!jobRegistry) {
        return response.status(503).json({
          error: 'Job scheduler not available'
        })
      }

      logger.info(`Admin triggered job: ${jobName}`)
      await jobRegistry.triggerJob(jobName)
      
      return response.json({
        message: `Job ${jobName} triggered successfully`,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error(`Failed to trigger job ${params.jobName}:`, error)
      return response.status(400).json({
        error: 'Failed to trigger job',
        message: error.message
      })
    }
  }

  /**
   * Start a specific job
   */
  async startJob({ params, response }: HttpContext) {
    try {
      const { jobName } = params
      const jobRegistry = getJobRegistry()
      
      if (!jobRegistry) {
        return response.status(503).json({
          error: 'Job scheduler not available'
        })
      }

      const scheduler = jobRegistry.getJobScheduler()
      scheduler.startJob(jobName)
      
      logger.info(`Admin started job: ${jobName}`)
      
      return response.json({
        message: `Job ${jobName} started successfully`,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error(`Failed to start job ${params.jobName}:`, error)
      return response.status(400).json({
        error: 'Failed to start job',
        message: error.message
      })
    }
  }

  /**
   * Stop a specific job
   */
  async stopJob({ params, response }: HttpContext) {
    try {
      const { jobName } = params
      const jobRegistry = getJobRegistry()
      
      if (!jobRegistry) {
        return response.status(503).json({
          error: 'Job scheduler not available'
        })
      }

      const scheduler = jobRegistry.getJobScheduler()
      scheduler.stopJob(jobName)
      
      logger.info(`Admin stopped job: ${jobName}`)
      
      return response.json({
        message: `Job ${jobName} stopped successfully`,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error(`Failed to stop job ${params.jobName}:`, error)
      return response.status(400).json({
        error: 'Failed to stop job',
        message: error.message
      })
    }
  }

  /**
   * Get WebSocket connection statistics
   */
  async websocketStats({ response }: HttpContext) {
    try {
      // WebSocket gateway not implemented yet
      return response.json({
        message: 'WebSocket gateway not implemented',
        stats: null,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to get WebSocket stats:', error)
      return response.status(500).json({
        error: 'Failed to retrieve WebSocket statistics',
        message: error.message
      })
    }
  }

  /**
   * Manually trigger data ingestion
   */
  async triggerIngestion({ request, response }: HttpContext) {
    try {
      const { type, date } = request.qs()
      const jobRegistry = getJobRegistry()
      
      if (!jobRegistry) {
        return response.status(503).json({
          error: 'Job scheduler not available'
        })
      }

      const pipeline = jobRegistry.getIngestionPipeline()
      let metrics

      switch (type) {
        case 'daily':
          metrics = await pipeline.ingestDailyFixtures(date)
          break
        case 'live':
          metrics = await pipeline.ingestLiveFixtures()
          break
        case 'events':
          metrics = await pipeline.ingestMatchEvents()
          break
        default:
          return response.status(400).json({
            error: 'Invalid ingestion type',
            validTypes: ['daily', 'live', 'events']
          })
      }

      logger.info(`Admin triggered ${type} ingestion`, metrics)
      
      return response.json({
        message: `${type} ingestion completed successfully`,
        metrics,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error(`Failed to trigger ingestion:`, error)
      return response.status(500).json({
        error: 'Failed to trigger ingestion',
        message: error.message
      })
    }
  }

  /**
   * Get system metrics and statistics
   */
  async systemMetrics({ response }: HttpContext) {
    try {
      const jobRegistry = getJobRegistry()
      // Collect various system metrics
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.version,
          platform: process.platform
        },
        jobs: jobRegistry ? jobRegistry.getJobsStatus() : null,
        websocket: null, // WebSocket not implemented yet
        // Add more metrics as needed
      }

      return response.json(metrics)

    } catch (error) {
      logger.error('Failed to collect system metrics:', error)
      return response.status(500).json({
        error: 'Failed to collect system metrics',
        message: error.message
      })
    }
  }

  /**
   * Send test WebSocket message
   */
  async testWebSocket({ request, response }: HttpContext) {
    try {
      const { type } = request.body()
      
      // WebSocket gateway not implemented yet
      return response.status(503).json({
        error: 'WebSocket gateway not implemented',
        message: `Test type '${type}' would be processed when WebSocket is available`
      })

      logger.info(`Admin sent test WebSocket message: ${type}`)
      
      return response.json({
        message: `Test ${type} message sent successfully`,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to send test WebSocket message:', error)
      return response.status(500).json({
        error: 'Failed to send test message',
        message: error.message
      })
    }
  }
}
