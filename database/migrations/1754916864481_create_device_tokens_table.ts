import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'device_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token', 512).notNullable().unique()
      table.enum('platform', ['ios', 'android', 'web']).notNullable()
      table.string('device_model', 100).nullable()
      table.string('app_version', 20).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_used').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index('user_id')
      table.index(['platform', 'is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}