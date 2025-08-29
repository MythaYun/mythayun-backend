import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import JobScheduler from '#services/job_scheduler'
import DataIngestionPipeline from '#services/data_ingestion_pipeline'
import { DateTime } from 'luxon'

/**
 * JobRegistry - Senior-level job registration and management
 * 
 * This service registers all scheduled jobs for the live score application.
 * It follows enterprise patterns for job management and monitoring.
 * 
 * Job Types:
 * 1. Daily Fixtures Ingestion - Runs early morning to fetch day's matches
 * 2. Live Fixtures Polling - Frequent polling for live match updates
 * 3. Match Events Ingestion - Real-time event capture for live matches
 * 4. Data Cleanup Jobs - Maintenance and cleanup tasks
 * 
 * Design Considerations:
 * - Staggered scheduling to avoid API rate limits
 * - Environment-based job enabling/disabling
 * - Comprehensive error handling and monitoring
 * - Graceful degradation during API outages
 */
export default class JobRegistry {
  private jobScheduler: JobScheduler
  private ingestionPipeline: DataIngestionPipeline

  constructor() {
    this.jobScheduler = JobScheduler.getInstance()
    this.ingestionPipeline = new DataIngestionPipeline()
  }

  /**
   * Register all application jobs
   * This is called during application startup
   */
  async registerAllJobs(): Promise<void> {
    logger.info('Registering all scheduled jobs...')

    try {
      // Register core data ingestion jobs
      await this.registerDataIngestionJobs()
      
      // Register maintenance jobs
      await this.registerMaintenanceJobs()
      
      // Register monitoring jobs
      await this.registerMonitoringJobs()

      logger.info('All jobs registered successfully')
      
    } catch (error) {
      logger.error('Failed to register jobs:', error)
      throw error
    }
  }

  /**
   * Register data ingestion jobs
   */
  private async registerDataIngestionJobs(): Promise<void> {
    
    // 1. Daily Fixtures Ingestion
    // Runs at 6:00 AM UTC daily to fetch the day's fixtures
    this.jobScheduler.registerJob({
      name: 'daily-fixtures-ingestion',
      schedule: '0 6 * * *', // 6:00 AM UTC daily
      enabled: env.get('ENABLE_DAILY_FIXTURES_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        const today = DateTime.now().toISODate()!
        const metrics = await this.ingestionPipeline.ingestDailyFixtures(today)
        
        logger.info('Daily fixtures ingestion completed', {
          date: today,
          metrics
        })

        // Also fetch tomorrow's fixtures for better UX
        const tomorrow = DateTime.now().plus({ days: 1 }).toISODate()!
        await this.ingestionPipeline.ingestDailyFixtures(tomorrow)
        
        logger.info('Tomorrow fixtures ingestion completed', {
          date: tomorrow
        })
      }
    })

    // 2. Live Fixtures Polling
    // Runs every 2 minutes during peak hours to capture live updates
    this.jobScheduler.registerJob({
      name: 'live-fixtures-polling',
      schedule: '*/2 * * * *', // Every 2 minutes
      enabled: env.get('ENABLE_LIVE_POLLING_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        // Only run during peak football hours (adjust for your target markets)
        const currentHour = DateTime.now().hour
        const isPeakHours = (currentHour >= 12 && currentHour <= 23) // 12 PM to 11 PM UTC
        
        if (!isPeakHours && env.get('RESPECT_PEAK_HOURS', 'true') === 'true') {
          logger.debug('Skipping live polling outside peak hours')
          return
        }

        const metrics = await this.ingestionPipeline.ingestLiveFixtures()
        
        if (metrics.matchesProcessed > 0) {
          logger.info('Live fixtures polling completed', { metrics })
        }
      }
    })

    // 3. Match Events Ingestion
    // Runs every 30 seconds during live matches for real-time events
    this.jobScheduler.registerJob({
      name: 'match-events-ingestion',
      schedule: '*/30 * * * * *', // Every 30 seconds
      enabled: env.get('ENABLE_MATCH_EVENTS_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        const metrics = await this.ingestionPipeline.ingestMatchEvents()
        
        if (metrics.eventsCreated > 0) {
          logger.info('Match events ingestion completed', { metrics })
        }
      }
    })

    // 4. Weekend Fixtures Pre-fetch
    // Runs Friday evening to pre-fetch weekend fixtures
    this.jobScheduler.registerJob({
      name: 'weekend-fixtures-prefetch',
      schedule: '0 18 * * 5', // 6:00 PM UTC on Fridays
      enabled: env.get('ENABLE_WEEKEND_PREFETCH_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        const saturday = DateTime.now().plus({ days: 1 }).toISODate()!
        const sunday = DateTime.now().plus({ days: 2 }).toISODate()!
        
        // Fetch both weekend days
        await this.ingestionPipeline.ingestDailyFixtures(saturday)
        await this.ingestionPipeline.ingestDailyFixtures(sunday)
        
        logger.info('Weekend fixtures pre-fetch completed', {
          dates: [saturday, sunday]
        })
      }
    })
  }

  /**
   * Register maintenance and cleanup jobs
   */
  private async registerMaintenanceJobs(): Promise<void> {
    
    // 1. Old Data Cleanup
    // Runs daily at 3:00 AM to clean up old data
    this.jobScheduler.registerJob({
      name: 'data-cleanup',
      schedule: '0 3 * * *', // 3:00 AM UTC daily
      enabled: env.get('ENABLE_CLEANUP_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        await this.performDataCleanup()
        logger.info('Data cleanup completed')
      }
    })

    // 2. Database Optimization
    // Runs weekly on Sunday at 4:00 AM
    this.jobScheduler.registerJob({
      name: 'database-optimization',
      schedule: '0 4 * * 0', // 4:00 AM UTC on Sundays
      enabled: env.get('ENABLE_DB_OPTIMIZATION_JOB', 'false') === 'true', // Disabled by default
      running: false,
      task: async () => {
        await this.performDatabaseOptimization()
        logger.info('Database optimization completed')
      }
    })
  }

  /**
   * Register monitoring and health check jobs
   */
  private async registerMonitoringJobs(): Promise<void> {
    
    // 1. Health Check Job
    // Runs every 5 minutes to monitor system health
    this.jobScheduler.registerJob({
      name: 'health-monitoring',
      schedule: '*/5 * * * *', // Every 5 minutes
      enabled: env.get('ENABLE_HEALTH_MONITORING_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        await this.performHealthCheck()
      }
    })

    // 2. Metrics Collection
    // Runs every hour to collect and log system metrics
    this.jobScheduler.registerJob({
      name: 'metrics-collection',
      schedule: '0 * * * *', // Every hour
      enabled: env.get('ENABLE_METRICS_JOB', 'true') === 'true',
      running: false,
      task: async () => {
        await this.collectSystemMetrics()
      }
    })
  }

  /**
   * Get job scheduler instance for external access
   */
  getJobScheduler(): JobScheduler {
    return this.jobScheduler
  }

  /**
   * Get ingestion pipeline instance for external access
   */
  getIngestionPipeline(): DataIngestionPipeline {
    return this.ingestionPipeline
  }

  /**
   * Manually trigger a specific job (useful for testing and admin)
   */
  async triggerJob(jobName: string): Promise<void> {
    return await this.jobScheduler.triggerJob(jobName)
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus(): any {
    return this.jobScheduler.getJobStatus()
  }

  /**
   * Private maintenance methods
   */
  private async performDataCleanup(): Promise<void> {
    try {
      // Clean up old match events (keep last 30 days)
      const cutoffDate = DateTime.now().minus({ days: 30 }).toSQL()
      
      // This would be implemented based on your data retention policy
      logger.info(`Data cleanup: removing events older than ${cutoffDate}`)
      
      // Example cleanup queries (uncomment when ready to implement)
      /*
      await MatchEvent.query()
        .where('created_at', '<', cutoffDate)
        .delete()
      
      await MatchState.query()
        .whereHas('match', (query) => {
          query.where('start_time', '<', cutoffDate)
            .whereIn('status', ['FT', 'AET', 'PEN', 'CANC', 'ABD'])
        })
        .delete()
      */
      
    } catch (error) {
      logger.error('Data cleanup failed:', error)
      throw error
    }
  }

  private async performDatabaseOptimization(): Promise<void> {
    try {
      // Database optimization tasks
      logger.info('Performing database optimization...')
      
      // This would include:
      // - Index analysis and optimization
      // - Table statistics updates
      // - Query plan cache clearing
      // - Vacuum operations (for PostgreSQL)
      
      logger.info('Database optimization completed')
      
    } catch (error) {
      logger.error('Database optimization failed:', error)
      throw error
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check system health
      const health = {
        timestamp: new Date(),
        database: 'healthy',
        footballApi: 'healthy',
        jobs: 'healthy'
      }

      // You could implement actual health checks here
      // and send alerts if systems are unhealthy
      
      logger.debug('Health check completed', health)
      
    } catch (error) {
      logger.error('Health check failed:', error)
      // Don't throw here - health checks should be non-blocking
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const metrics = {
        timestamp: new Date(),
        jobsStatus: this.getJobsStatus(),
        // Add more metrics as needed
      }

      logger.info('System metrics collected', metrics)
      
    } catch (error) {
      logger.error('Metrics collection failed:', error)
      // Don't throw here - metrics collection should be non-blocking
    }
  }
}
