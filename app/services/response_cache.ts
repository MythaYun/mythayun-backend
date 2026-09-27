/**
 * Small in-memory cache for football provider responses.
 *
 * Every visitor shares one cached copy, and concurrent requests for the same
 * key wait for a single upstream call instead of each making their own. The
 * time-to-live is decided per value, so live data can expire in seconds while
 * finished matches stay for hours.
 *
 * Process-local: it resets on restart and isn't shared between instances,
 * which is fine for a single Railway instance.
 */
interface Entry<T> {
  value: T
  expiresAt: number
}

export default class ResponseCache {
  private entries = new Map<string, Entry<unknown>>()
  private inFlight = new Map<string, Promise<unknown>>()

  constructor(private maxEntries = 500) {}

  /**
   * Return the cached value for `key`, or call `load` and cache its result for
   * `ttlSeconds(value)` seconds. A failed load is not cached.
   */
  async getOrLoad<T>(key: string, load: () => Promise<T>, ttlSeconds: (value: T) => number): Promise<T> {
    const cached = this.entries.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T
    }

    const pending = this.inFlight.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    const promise = (async () => {
      try {
        const value = await load()
        this.set(key, value, ttlSeconds(value))
        return value
      } finally {
        this.inFlight.delete(key)
      }
    })()

    this.inFlight.set(key, promise)
    return promise
  }

  private set(key: string, value: unknown, ttlSeconds: number) {
    if (ttlSeconds <= 0) return

    // Map keeps insertion order: drop the oldest entries once full
    this.entries.delete(key)
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }
}
