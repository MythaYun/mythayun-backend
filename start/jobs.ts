/**
 * Job Registry - Central job management system
 * 
 * Provides job registration, monitoring, and management capabilities
 * for the MythaYun backend application.
 */

import JobScheduler from '#services/job_scheduler'

export interface JobInfo {
  id: string
  name: string
  schedule: string
  status: 'active' | 'inactive' | 'error'
  lastRun?: Date
  nextRun?: Date
  description?: string
}

class JobRegistry {
  private jobs: Map<string, JobInfo> = new Map()
  private scheduler: JobScheduler

  constructor() {
    this.scheduler = JobScheduler.getInstance()
  }

  /**
   * Register a new job in the registry
   */
  register(job: JobInfo): void {
    this.jobs.set(job.id, job)
  }

  /**
   * Get all registered jobs
   */
  getAll(): JobInfo[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get a specific job by ID
   */
  getById(id: string): JobInfo | undefined {
    return this.jobs.get(id)
  }

  /**
   * Update job status
   */
  updateStatus(id: string, status: JobInfo['status']): void {
    const job = this.jobs.get(id)
    if (job) {
      job.status = status
      this.jobs.set(id, job)
    }
  }

  /**
   * Get job statistics
   */
  getStats(): { total: number; active: number; inactive: number; error: number } {
    const jobs = this.getAll()
    return {
      total: jobs.length,
      active: jobs.filter(j => j.status === 'active').length,
      inactive: jobs.filter(j => j.status === 'inactive').length,
      error: jobs.filter(j => j.status === 'error').length
    }
  }

  /**
   * Get jobs status (required by admin_controller)
   */
  getJobsStatus(): { active: JobInfo[]; inactive: JobInfo[]; error: JobInfo[] } {
    const jobs = this.getAll()
    return {
      active: jobs.filter(j => j.status === 'active'),
      inactive: jobs.filter(j => j.status === 'inactive'),
      error: jobs.filter(j => j.status === 'error')
    }
  }

  /**
   * Trigger a job manually (required by admin_controller)
   */
  async triggerJob(jobName: string): Promise<void> {
    const job = Array.from(this.jobs.values()).find(j => j.name === jobName)
    if (job) {
      job.lastRun = new Date()
      job.status = 'active'
      this.jobs.set(job.id, job)
      // TODO: Implement actual job execution logic
      console.log(`Triggered job: ${jobName}`)
    }
  }

  /**
   * Get the job scheduler instance (required by admin_controller)
   */
  getJobScheduler(): JobScheduler {
    return this.scheduler
  }

  /**
   * Get ingestion pipeline status (required by admin_controller)
   */
  getIngestionPipeline(): { 
    status: string; 
    lastRun?: Date; 
    nextRun?: Date;
    ingestDailyFixtures: (date?: string) => Promise<any>;
    ingestLiveFixtures: () => Promise<any>;
    ingestMatchEvents: () => Promise<any>;
  } {
    return {
      status: 'active',
      lastRun: new Date(Date.now() - 3600000), // 1 hour ago
      nextRun: new Date(Date.now() + 3600000),  // 1 hour from now
      
      // Stub methods for ingestion pipeline
      async ingestDailyFixtures(date?: string) {
        console.log(`Ingesting daily fixtures for date: ${date || 'today'}`)
        return {
          processed: 10,
          success: 9,
          errors: 1,
          duration: '2.5s'
        }
      },
      
      async ingestLiveFixtures() {
        console.log('Ingesting live fixtures')
        return {
          processed: 5,
          success: 5,
          errors: 0,
          duration: '1.2s'
        }
      },
      
      async ingestMatchEvents() {
        console.log('Ingesting match events')
        return {
          processed: 15,
          success: 14,
          errors: 1,
          duration: '3.1s'
        }
      }
    }
  }
}

// Singleton instance
const jobRegistry = new JobRegistry()

// Register default jobs
jobRegistry.register({
  id: 'sync-fixtures',
  name: 'Sync Football Fixtures',
  schedule: '0 */6 * * *', // Every 6 hours
  status: 'active',
  description: 'Synchronize football fixtures from external API'
})

jobRegistry.register({
  id: 'cleanup-logs',
  name: 'Cleanup Old Logs',
  schedule: '0 2 * * *', // Daily at 2 AM
  status: 'active',
  description: 'Remove old log files and cleanup storage'
})

/**
 * Get the global job registry instance
 */
export function getJobRegistry(): JobRegistry {
  return jobRegistry
}

export default jobRegistry
