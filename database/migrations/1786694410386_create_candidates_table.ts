import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').notNullable().unsigned().references('users.id')
      table.integer('round_id').notNullable().unsigned().references('rounds.id')
      table.text('statement').nullable()
      table.text('answers').notNullable().defaultTo('{}')
      table.string('status', 20).notNullable().defaultTo('approved')
      table.boolean('entered_voting2').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'round_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
