import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'follows'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.enum('entity_type', ['team', 'league', 'match']).notNullable()
      table.string('entity_id').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes for performance
      table.index(['user_id'])
      table.index(['entity_type', 'entity_id'])
      table.unique(['user_id', 'entity_type', 'entity_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
