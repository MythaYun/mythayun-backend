import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'teams'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('short_name').notNullable()
      table.string('logo_url').nullable()
      table.string('league_id').nullable().references('id').inTable('leagues').onDelete('SET NULL')
      table.jsonb('provider_ids').notNullable().defaultTo('{}')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Indexes for performance
      table.index('league_id')
      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
