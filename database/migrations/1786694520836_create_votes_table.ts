import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'votes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').notNullable().unsigned().references('users.id')
      table.integer('round_id').notNullable().unsigned().references('rounds.id')
      table.integer('phase').notNullable()
      table.integer('candidate_id').notNullable().unsigned().references('candidates.id')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'round_id', 'phase', 'candidate_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
