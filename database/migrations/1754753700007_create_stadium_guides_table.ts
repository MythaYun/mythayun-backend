import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'stadium_guides'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('venue_id').notNullable().references('id').inTable('venues').onDelete('CASCADE')
      table.string('title').notNullable()
      table.jsonb('sections').notNullable().defaultTo('{}')
      table.jsonb('facilities').notNullable().defaultTo('{}')
      table.jsonb('images').notNullable().defaultTo('{}')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Indexes for performance
      table.index('venue_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
