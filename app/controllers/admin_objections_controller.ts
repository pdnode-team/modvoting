import Objection from '#models/objection'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminObjectionsController {
  async index({ inertia }: HttpContext) {
    const objections = await Objection.query()
      .preload('user')
      .preload('candidate', (q) => q.preload('user'))
      .orderBy('createdAt', 'desc')
      .limit(100)

    return inertia.render('admin/objections', {
      objections: objections.map((o) => ({
        id: o.id,
        reason: o.reason,
        createdAt: o.createdAt.toISO() ?? '',
        objector: o.user?.email ?? null,
        target: o.candidate?.user?.fullName ?? o.candidate?.user?.email ?? null,
      })),
    })
  }
}
