import Round from '#models/round'
import { VoteService } from '#services/vote_service'
import { levelGuard } from '#services/level_guard'
import { voteValidator } from '#validators/vote'
import type { HttpContext } from '@adonisjs/core/http'

export default class VoteController {
  async store({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    const round = await Round.findOrFail(params.id)
    const { candidateIds } = await request.validateUsing(voteValidator)

    const phase = round.status === 'voting1' ? 1 : round.status === 'voting2' ? 2 : null
    if (!phase) {
      session.flash('error', 'Voting is not open right now')
      return response.redirect().back()
    }

    try {
      await new VoteService(levelGuard).castVotes(user, round, phase, candidateIds)
      session.flash('success', phase === 1 ? 'Round 1 votes cast' : 'Round 2 votes cast')
    } catch (error) {
      session.flash('error', error instanceof Error ? error.message : 'Failed to cast votes')
    }

    return response.redirect().back()
  }
}
