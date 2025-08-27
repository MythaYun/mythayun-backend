import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'match_states'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('match_id').primary().references('id').inTable('matches').onDelete('CASCADE')
      table.integer('minute').nullable()
      table.string('phase').notNullable().defaultTo('NOT_STARTED')
      table.integer('home_score').notNullable().defaultTo(0)
      table.integer('away_score').notNullable().defaultTo(0)
      table.string('last_event_id').nullable()

      table.timestamp('updated_at').notNullable()

      // Indexes for performance
      table.index('phase')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
