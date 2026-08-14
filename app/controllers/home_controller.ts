import Candidate from '#models/candidate'
import Round from '#models/round'
import { electionConfig } from '#config/elections'
import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async show({ inertia }: HttpContext) {
    const round = await Round.query()
      .whereNot('status', 'closed')
      .orderBy('startsAt', 'desc')
      .first()

    const candidates = round
      ? await Candidate.query()
          .where('roundId', round.id)
          .where('status', 'approved')
          .preload('user')
          .orderBy('createdAt', 'asc')
      : []

    return inertia.render('home', {
      round: round
        ? {
            id: round.id,
            month: round.month,
            status: round.status,
            mode: round.mode,
            startsAt: round.startsAt.toISO()!,
            campaignEndsAt: round.campaignEndsAt.toISO()!,
            voting1EndsAt: round.voting1EndsAt?.toISO() ?? null,
            voting2EndsAt: round.voting2EndsAt?.toISO() ?? null,
            endsAt: round.endsAt.toISO()!,
            special: Boolean(round.special),
          }
        : null,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.user?.fullName ?? c.user?.email,
        statement: c.statement,
      })),
      previousModerators: electionConfig.previousModerators.map((m) => m.name),
    })
  }
}
