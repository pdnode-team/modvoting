import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'objections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('round_id').notNullable().unsigned().references('rounds.id')
      table.integer('target_candidate_id').notNullable().unsigned().references('candidates.id')
      table.integer('user_id').notNullable().unsigned().references('users.id')
      table.text('reason').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['round_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
