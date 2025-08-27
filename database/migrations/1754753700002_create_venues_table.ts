import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'venues'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('city').notNullable()
      table.integer('capacity').nullable()
      table.jsonb('provider_ids').notNullable().defaultTo('{}')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Indexes for performance
      table.index('city')
      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
