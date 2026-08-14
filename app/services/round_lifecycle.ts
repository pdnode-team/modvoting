import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Candidate from '#models/candidate'
import Round from '#models/round'
import TieBreak from '#models/tie_break'
import { selectTop, type TallyRow } from './tie_break_utils.js'

interface LifecycleOptions {
  now?: () => DateTime
}

export const AFFIRMATIVE_CAP = 3
export const TOP5 = 5
export const TOP3 = 3

/**
 * 轮次状态机（按当前时间推进）：
 * campaigning → (≤3) objection(公示32h) / (>3) voting1
 * voting1 → Top5 进二轮 → voting2
 * voting2 → Top3 当选 → closed
 * objection → closed
 */
export class RoundLifecycle {
  readonly #now: () => DateTime

  constructor(options: LifecycleOptions = {}) {
    this.#now = options.now ?? (() => DateTime.now())
  }

  async refresh(round: Round): Promise<void> {
    const now = this.#now()

    if (round.status === 'campaigning' && now >= round.campaignEndsAt) {
      await this.#closeCampaign(round)
    } else if (round.status === 'voting1' && round.voting1EndsAt && now >= round.voting1EndsAt) {
      await this.#closeVoting(round, 1)
    } else if (round.status === 'voting2' && round.voting2EndsAt && now >= round.voting2EndsAt) {
      await this.#closeVoting(round, 2)
    } else if (round.status === 'objection' && now >= round.endsAt) {
      round.status = 'closed'
      await round.save()
    }
  }

  async refreshAll(): Promise<void> {
    const rounds = await Round.query().whereNot('status', 'closed')
    for (const round of rounds) {
      await this.refresh(round)
    }
  }

  async #closeCampaign(round: Round): Promise<void> {
    const [{ $extras }] = await Candidate.query()
      .where('roundId', round.id)
      .where('status', 'approved')
      .count('* as c')

    if (Number($extras.c) <= AFFIRMATIVE_CAP) {
      round.mode = 'acclamation'
      round.status = 'objection' // 免投票 → 公示期（异议窗口）
    } else {
      round.mode = 'election'
      round.status = 'voting1'
    }
    await round.save()
  }

  async #closeVoting(round: Round, phase: 1 | 2): Promise<void> {
    const tally = await this.#tally(round, phase)
    const n = phase === 1 ? TOP5 : TOP3
    const stage = phase === 1 ? 'top5' : 'winners'

    const { selected, tieBreak } = selectTop(tally, n)
    if (tieBreak) {
      await TieBreak.create({
        roundId: round.id,
        stage,
        candidateIds: JSON.stringify(tieBreak.pool),
        selectedIds: JSON.stringify(tieBreak.chosen),
        seed: tieBreak.seed,
      })
    }

    if (phase === 1) {
      await Candidate.query().whereIn('id', selected).update({ enteredVoting2: true })
      round.status = 'voting2'
    } else {
      round.status = 'closed'
    }
    await round.save()
  }

  async #tally(round: Round, phase: 1 | 2): Promise<TallyRow[]> {
    const rows = await db
      .from('votes')
      .select('candidate_id')
      .count('* as c')
      .where('round_id', round.id)
      .where('phase', phase)
      .groupBy('candidate_id')

    return rows.map((r) => ({
      candidateId: Number(r.candidate_id),
      votes: Number(r.c),
    }))
  }
}
