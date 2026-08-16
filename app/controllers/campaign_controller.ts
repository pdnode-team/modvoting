import Round from '#models/round'
import { CampaignService } from '#services/campaign_service'
import { levelGuard } from '#services/level_guard'
import { campaignValidator } from '#validators/campaign'
import { checkLimit } from '#services/rate_limit'
import type { HttpContext } from '@adonisjs/core/http'

export default class CampaignController {
  async store({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    const round = await Round.findOrFail(params.id)
    const payload = await request.validateUsing(campaignValidator)

    // 限速：防重复报名（1h 3 次；正常用户只报一次）
    const limit = checkLimit('campaign', `user:${user.zulipUserId ?? user.id}`)
    if (!limit.allowed) {
      session.flash(
        'error',
        `Too many submissions, retry in ${Math.ceil(limit.resetInMs / 60_000)}min`
      )
      return response.redirect().back()
    }

    try {
      await new CampaignService(levelGuard).apply(user, round, {
        months: payload.months,
        opinions: payload.opinions,
      })
      session.flash('success', 'Application submitted, good luck!')
    } catch (error) {
      session.flash('error', error instanceof Error ? error.message : 'Application failed')
    }

    return response.redirect().back()
  }
}
