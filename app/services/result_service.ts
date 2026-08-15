import db from '@adonisjs/lucid/services/db'
import Candidate from '#models/candidate'
import type Round from '#models/round'
import TieBreak from '#models/tie_break'
import { selectTop, type TallyRow } from './tie_break_utils.js'
import { electionConfig } from '#config/elections'

export interface ResultEntry {
  candidate: Candidate
  votes: number
}

export interface RoundResults {
  winners: ResultEntry[]
  phase1: ResultEntry[]
  phase2: ResultEntry[]
}

/**
 * 结果聚合：
 * - acclamation：全部 approved 候选人为 winners（无投票）
 * - election：phase2 票数 Top(winnersCount) 为 winners；若 winners 位置存在平票随机，
 *   以 tie_breaks 记录为准（可审计、可重现）。
 */
export class ResultService {
  async resultsFor(round: Round): Promise<RoundResults> {
    const candidates = await Candidate.query()
      .where('roundId', round.id)
      .where('status', 'approved')
      .preload('user')

    const phase1 = await this.#tallyWithCandidates(round, 1, candidates)
    const phase2 = await this.#tallyWithCandidates(round, 2, candidates)

    if (round.mode === 'acclamation') {
      return {
        winners: candidates.map((c) => ({ candidate: c, votes: 0 })),
        phase1: [],
        phase2: [],
      }
    }

    const tally = phase2.map((e) => ({ candidateId: e.candidate.id, votes: e.votes }))
    const winners = await this.#resolveWinners(round, tally, candidates)

    return { winners, phase1, phase2 }
  }

  async #resolveWinners(
    round: Round,
    tally: TallyRow[],
    candidates: Candidate[]
  ): Promise<ResultEntry[]> {
    const tieBreak = await TieBreak.query()
      .where('roundId', round.id)
      .where('stage', 'winners')
      .first()

    let selected: number[]
    if (tieBreak) {
      // 平票随机已发生：以记录为准（locked 部分按票数 + tie_break 选中部分）
      const chosen = JSON.parse(tieBreak.selectedIds) as number[]
      // locked = 票数 > 第 winnersCount 名（tie_break 未包含的确定入选者）
      const sorted = [...tally].sort((a, b) => b.votes - a.votes)
      const cutoff = sorted[electionConfig.winnersCount - 1].votes
      const locked = sorted.filter((s) => s.votes > cutoff).map((s) => s.candidateId)
      selected = [...locked, ...chosen]
    } else {
      selected = selectTop(tally, electionConfig.winnersCount).selected
    }

    const byId = new Map(candidates.map((c) => [c.id, c]))
    const voteMap = new Map(tally.map((t) => [t.candidateId, t.votes]))

    return selected.map((id) => ({
      candidate: byId.get(id)!,
      votes: voteMap.get(id) ?? 0,
    }))
  }

  async #tallyWithCandidates(
    round: Round,
    phase: 1 | 2,
    candidates: Candidate[]
  ): Promise<ResultEntry[]> {
    const rows = await db
      .from('votes')
      .select('candidate_id')
      .count('* as c')
      .where('round_id', round.id)
      .where('phase', phase)
      .groupBy('candidate_id')

    const voteMap = new Map(rows.map((r) => [Number(r.candidate_id), Number(r.c)]))
    const byId = new Map(candidates.map((c) => [c.id, c]))

    return [...voteMap.entries()]
      .map(([candidateId, votes]) => ({ candidate: byId.get(candidateId)!, votes }))
      .filter((e) => e.candidate)
      .sort((a, b) => b.votes - a.votes)
  }
}
