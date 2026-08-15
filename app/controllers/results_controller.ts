import Round from '#models/round'
import { ResultService } from '#services/result_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class ResultsController {
  async show({ inertia, params }: HttpContext) {
    const round = params.id
      ? await Round.findOrFail(params.id)
      : await Round.query().where('status', 'closed').orderBy('endsAt', 'desc').first()

    if (!round) {
      return inertia.render('results/show', { round: null, results: null })
    }

    const results = await new ResultService().resultsFor(round)
    return inertia.render('results/show', {
      round: {
        id: round.id,
        month: round.month,
        status: round.status,
        mode: round.mode,
      },
      results: {
        winners: results.winners.map((e) => ({
          name: e.candidate.user?.fullName ?? e.candidate.user?.email,
          votes: e.votes,
        })),
        phase1: results.phase1.map((e) => ({
          name: e.candidate.user?.fullName ?? e.candidate.user?.email,
          votes: e.votes,
        })),
        phase2: results.phase2.map((e) => ({
          name: e.candidate.user?.fullName ?? e.candidate.user?.email,
          votes: e.votes,
        })),
      },
    })
  }
}
