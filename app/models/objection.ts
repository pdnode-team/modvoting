import { ObjectionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Candidate from './candidate.js'

export default class Objection extends ObjectionSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Candidate)
  declare candidate: BelongsTo<typeof Candidate>
}
