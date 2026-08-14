import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tie_breaks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('round_id').notNullable().unsigned().references('rounds.id')
      table.string('stage', 20).notNullable() // 'top5' | 'winners'
      table.text('candidate_ids').notNullable() // JSON
      table.text('selected_ids').notNullable() // JSON
      table.string('seed', 64).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
