import Round from '#models/round'
import { ObjectionService } from '#services/objection_service'
import { mailService } from '#services/mail_service'
import { objectionValidator } from '#validators/objection'
import type { HttpContext } from '@adonisjs/core/http'

export default class ObjectionController {
  async store({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    const round = await Round.findOrFail(params.id)
    const { targetCandidateId, reason } = await request.validateUsing(objectionValidator)

    try {
      const objection = await new ObjectionService().submit(user, round, targetCandidateId, reason)
      await mailService.sendAdminObjection(objection.id)
      session.flash('success', 'Objection submitted, the admin will be notified')
    } catch (error) {
      session.flash('error', error instanceof Error ? error.message : 'Submission failed')
    }

    return response.redirect().back()
  }
}
