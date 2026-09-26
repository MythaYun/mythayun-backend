import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * Allowed browser origins, from CORS_ORIGINS (comma-separated).
 * An entry may contain `*` to match one subdomain label, e.g.
 * `https://mythayun-front-*.vercel.app` for Vercel preview deploys.
 *
 * In development, localhost:3000 is always allowed.
 */
const configured = (env.get('CORS_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

if (env.get('NODE_ENV') === 'development') {
  configured.push('http://localhost:3000', 'http://127.0.0.1:3000')
}

const matchers = configured.map((pattern) => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+')
  return new RegExp(`^${escaped}$`, 'i')
})

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: (requestOrigin) => matchers.some((matcher) => matcher.test(requestOrigin)),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  // Auth uses Bearer tokens, not cookies, so browsers never need to send credentials
  credentials: false,
  maxAge: 90,
})

export default corsConfig
