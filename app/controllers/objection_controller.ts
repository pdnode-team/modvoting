import Round from '#models/round'
import { ObjectionService } from '#services/objection_service'
import { objectionValidator } from '#validators/objection'
import type { HttpContext } from '@adonisjs/core/http'

export default class ObjectionController {
  async store({ auth, params, request, response, session, logger }: HttpContext) {
    const user = auth.user!
    const round = await Round.findOrFail(params.id)
    const { targetCandidateId, reason } = await request.validateUsing(objectionValidator)

    try {
      const objection = await new ObjectionService().submit(user, round, targetCandidateId, reason)
      // TODO(Task 13): 邮件通知 admin（objection.id, round, target, reason）
      logger.info({ objectionId: objection.id, roundId: round.id }, 'objection submitted')
      session.flash('success', '异议已提交，管理员将收到通知')
    } catch (error) {
      session.flash('error', error instanceof Error ? error.message : '提交失败')
    }

    return response.redirect().back()
  }
}
