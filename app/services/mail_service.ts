import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import Candidate from '#models/candidate'
import Objection from '#models/objection'
import Round from '#models/round'
import User from '#models/user'
import { ResultService, type RoundResults } from './result_service.js'

/**
 * 邮件通知：
 * - 邮箱验证链接（16h 一次性）
 * - 结果公布：当选 / 落选 / 投票者
 * - 异议提交：通知 admin
 */
export class MailService {
  async sendVerifyLink(email: string, token: string): Promise<void> {
    const url = `${env.get('APP_URL')}/verify/confirm?token=${token}`
    await mail.send((m) => {
      m.to(email).subject('Pdnode 选举：验证你的邮箱').htmlView('emails/verify_link', { url })
    })
  }

  async sendResults(round: Round, results: RoundResults): Promise<void> {
    const month = round.month
    const winnerNames = results.winners.map(
      (w) => w.candidate.user?.fullName ?? w.candidate.user?.email ?? '?'
    )

    // 当选者
    for (const w of results.winners) {
      const email = w.candidate.user?.email
      if (!email) continue
      await mail.send((m) => {
        m.to(email)
          .subject(`🎉 ${month} 月选举：你当选了！`)
          .htmlView('emails/result_won', {
            month,
            votes: w.votes,
            effectiveFrom: round.endsAt.toFormat('yyyy-MM-dd'),
          })
      })
    }

    // 落选者（approved 候选人中非当选者）
    const winnerIds = new Set(results.winners.map((w) => w.candidate.id))
    const approved = await Candidate.query()
      .where('roundId', round.id)
      .where('status', 'approved')
      .preload('user')
    for (const c of approved) {
      if (winnerIds.has(c.id) || !c.user?.email) continue
      const entry = results.phase2.find((e) => e.candidate.id === c.id)
      await mail.send((m) => {
        m.to(c.user!.email!)
          .subject(`${month} 月选举结果`)
          .htmlView('emails/result_lost', { month, votes: entry?.votes ?? 0 })
      })
    }

    // 投票者（该轮投过票的用户）
    const voterRows = await db.from('votes').distinct('user_id').where('round_id', round.id)
    for (const row of voterRows) {
      const user = await User.find(Number(row.user_id))
      if (!user?.email) continue
      await mail.send((m) => {
        m.to(user.email!)
          .subject(`${month} 月选举结果公布`)
          .htmlView('emails/result_voter', { month, winners: winnerNames })
      })
    }
  }

  async sendAdminObjection(objectionId: number): Promise<void> {
    const objection = await Objection.query()
      .where('id', objectionId)
      .preload('user')
      .preload('candidate', (q) => q.preload('user'))
      .firstOrFail()
    const round = await Round.findOrFail(objection.roundId)

    await mail.send((m) => {
      m.to(env.get('MAIL_FROM_ADDRESS'))
        .subject('新的选举异议')
        .htmlView('emails/objection_admin', {
          month: round.month,
          target: objection.candidate?.user?.fullName ?? objection.candidate?.user?.email ?? '?',
          objector: objection.user?.email ?? '?',
          reason: objection.reason,
          adminUrl: `${env.get('APP_URL')}/admin/objections`,
        })
    })
  }
}

export const mailService = new MailService()

/** 结果确定后批量通知（当选/落选/投票者） */
export async function notifyResults(round: Round): Promise<void> {
  const results = await new ResultService().resultsFor(round)
  await mailService.sendResults(round, results)
}
