import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leagues'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('country').notNullable()
      table.integer('season').notNullable()
      table.string('logo_url').nullable()
      table.jsonb('provider_ids').notNullable().defaultTo('{}')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Indexes for performance
      table.index(['country', 'season'])
      table.index('season')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
