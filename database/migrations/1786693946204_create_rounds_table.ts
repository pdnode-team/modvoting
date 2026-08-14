import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rounds'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('month', 7).notNullable().unique()
      table.timestamp('starts_at').notNullable()
      table.timestamp('campaign_ends_at').notNullable()
      table.timestamp('voting_1_ends_at').nullable()
      table.timestamp('voting_2_ends_at').nullable()
      table.timestamp('ends_at').notNullable()
      table.boolean('special').notNullable().defaultTo(false)
      table.string('mode', 20).notNullable().defaultTo('undecided')
      table.string('status', 20).notNullable().defaultTo('campaigning')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
