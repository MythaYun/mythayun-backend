import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Authentication and security fields
      table.string('auth_provider').defaultTo('email').notNullable()
      table.boolean('email_verified').defaultTo(false).notNullable()
      table.string('account_status').defaultTo('active').notNullable()
      table.integer('failed_login_attempts').nullable()
      table.timestamp('last_login_at').nullable()
      table.timestamp('last_failed_login_at').nullable()

      // Profile fields
      table.string('profile_picture').nullable()
      table.string('timezone').nullable()
      table.string('language').nullable()
      table.json('notification_preferences').nullable()

      // Privacy settings
      table.boolean('is_private').defaultTo(false).notNullable()
      table.boolean('allow_follow_requests').defaultTo(true).notNullable()

      // Indexes for performance
      table.index(['auth_provider'])
      table.index(['account_status'])
      table.index(['email_verified'])
      table.index(['last_login_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('auth_provider')
      table.dropColumn('email_verified')
      table.dropColumn('account_status')
      table.dropColumn('failed_login_attempts')
      table.dropColumn('last_login_at')
      table.dropColumn('last_failed_login_at')
      table.dropColumn('profile_picture')
      table.dropColumn('timezone')
      table.dropColumn('language')
      table.dropColumn('notification_preferences')
      table.dropColumn('is_private')
      table.dropColumn('allow_follow_requests')
    })
  }
}
