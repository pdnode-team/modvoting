import { DateTime } from 'luxon'
import Candidate from '#models/candidate'
import Round from '#models/round'
import { electionConfig } from '#config/elections'
import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async show({ inertia }: HttpContext) {
    const round = await Round.query()
      .whereNot('status', 'closed')
      .orderBy('startsAt', 'asc')
      .first()

    /**
     * 报名目标轮：最早的 campaigning 轮（含未开始）。
     * 自然 = "下个月的选举"：特殊轮（提前开启）自动优先，无轮次月自动跳过。
     */
    const campaignRound = await Round.query()
      .where('status', 'campaigning')
      .where('endsAt', '>', DateTime.now().toSQL())
      .orderBy('startsAt', 'asc')
      .first()

    const candidates = round
      ? await Candidate.query()
          .where('roundId', round.id)
          .where('status', 'approved')
          .preload('user')
          .orderBy('createdAt', 'asc')
      : []

    const serialize = (r: Round) => ({
      id: r.id,
      month: r.month,
      status: r.status,
      mode: r.mode,
      startsAt: r.startsAt.toISO()!,
      campaignEndsAt: r.campaignEndsAt.toISO()!,
      voting1EndsAt: r.voting1EndsAt?.toISO() ?? null,
      voting2EndsAt: r.voting2EndsAt?.toISO() ?? null,
      endsAt: r.endsAt.toISO()!,
      special: Boolean(r.special),
    })

    return inertia.render('home', {
      round: round ? serialize(round) : null,
      campaignRound: campaignRound ? serialize(campaignRound) : null,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.user?.fullName ?? c.user?.email,
        statement: c.statement,
      })),
      previousModerators: electionConfig.previousModerators.map((m) => m.name),
    })
  }
}
