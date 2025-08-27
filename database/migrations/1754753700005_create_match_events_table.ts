import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'match_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('match_id').notNullable().references('id').inTable('matches').onDelete('CASCADE')
      table.timestamp('ts').notNullable()
      table.string('type').notNullable()
      table.string('team_id').nullable().references('id').inTable('teams').onDelete('SET NULL')
      table.string('player_id').nullable()
      table.string('player_name').nullable()
      table.jsonb('detail_json').notNullable().defaultTo('{}')
      table.string('provider_event_id').notNullable().unique()

      table.timestamp('created_at').notNullable()

      // Indexes for performance
      table.index(['match_id', 'ts'])
      table.index(['type'])
      table.index(['team_id'])
      table.index('provider_event_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
