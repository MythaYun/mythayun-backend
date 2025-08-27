import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'matches'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('league_id').notNullable().references('id').inTable('leagues').onDelete('CASCADE')
      table.integer('season').notNullable()
      table.string('home_team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE')
      table.string('away_team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE')
      table.string('venue_id').nullable().references('id').inTable('venues').onDelete('SET NULL')
      table.timestamp('start_time').notNullable()
      table.string('status').notNullable().defaultTo('NS')
      table.jsonb('provider_ids').notNullable().defaultTo('{}')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Indexes for performance
      table.index(['league_id', 'season'])
      table.index(['start_time'])
      table.index(['status'])
      table.index(['home_team_id'])
      table.index(['away_team_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
