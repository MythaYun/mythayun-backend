import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface ThrottleOptions {
  /** Maximum requests allowed per window */
  max: number
  /** Window length in seconds */
  windowSeconds: number
}

interface Bucket {
  count: number
  resetAt: number
}

/**
 * In-memory fixed-window rate limiter, keyed by client IP and route.
 *
 * Counters live in process memory, so they reset on restart and aren't shared
 * between instances. That's fine for a single Railway instance; move to
 * @adonisjs/limiter with Redis if the backend is ever scaled horizontally.
 */
const buckets = new Map<string, Bucket>()

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 60_000).unref()

export default class ThrottleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: ThrottleOptions) {
    const route = ctx.route?.pattern ?? ctx.request.url()
    const key = `${ctx.request.ip()}:${route}`
    const now = Date.now()

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowSeconds * 1000 }
      buckets.set(key, bucket)
    }

    bucket.count++

    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    ctx.response.header('X-RateLimit-Limit', String(options.max))
    ctx.response.header('X-RateLimit-Remaining', String(Math.max(0, options.max - bucket.count)))

    if (bucket.count > options.max) {
      ctx.response.header('Retry-After', String(retryAfter))
      return ctx.response.status(429).json({
        error: 'Too many requests',
        message: `Please try again in ${retryAfter} seconds`
      })
    }

    return next()
  }
}
