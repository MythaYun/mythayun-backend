import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

/**
 * SSL to the database: on by default in production (Railway requires it).
 * Set DB_SSL=false for a database on the same private network without SSL,
 * e.g. a Dokploy-managed PostgreSQL.
 */
const useSsl = env.get('DB_SSL') ?? env.get('NODE_ENV') === 'production'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: env.get('DATABASE_URL') ? {
        connectionString: env.get('DATABASE_URL'),
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      } : {
        // Fallback to individual environment variables
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig