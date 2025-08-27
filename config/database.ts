import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: env.get('DATABASE_URL') ? {
        // Use Railway's DATABASE_URL if available
        connectionString: env.get('DATABASE_URL'),
        ssl: env.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
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