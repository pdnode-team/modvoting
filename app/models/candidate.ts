import { CandidateSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Candidate extends CandidateSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
