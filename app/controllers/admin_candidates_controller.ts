import Candidate from '#models/candidate'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminCandidatesController {
  async index({ inertia }: HttpContext) {
    const candidates = await Candidate.query()
      .preload('user')
      .preload('round')
      .orderBy('createdAt', 'desc')
      .limit(200)

    return inertia.render('admin/candidates', {
      candidates: candidates.map((c) => {
        const raw = c.answers
        const answers =
          typeof raw === 'string' ? (JSON.parse(raw || '{}') as Record<string, unknown>) : raw
        return {
          id: c.id,
          month: c.round?.month ?? null,
          name: c.user?.fullName ?? c.user?.email ?? '?',
          months: typeof answers.months === 'number' ? answers.months : null,
          opinions: (answers.opinions ?? {}) as Record<string, number>,
          createdAt: c.createdAt.toISO() ?? '',
        }
      }),
    })
  }
}
