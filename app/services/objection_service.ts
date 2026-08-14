import { DateTime } from 'luxon'
import Candidate from '#models/candidate'
import Objection from '#models/objection'
import Round from '#models/round'
import User from '#models/user'

export class ObjectionPhaseError extends Error {}
export class InvalidTargetError extends Error {}
export class CooldownError extends Error {}
export class RateLimitError extends Error {}

export const OBJECTION_COOLDOWN_HOURS = 2
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
export const RATE_LIMIT_MAX_ATTEMPTS = 5

/**
 * 异议（免投票公示期）：
 * - 仅公示期（round.status === 'objection'）可提交
 * - 目标必须为该轮当选者（acclamation 模式下 approved 候选人）
 * - 成功提交后 2h 冷却（用户级）
 * - 提交尝试限速：10 分钟窗口内最多 5 次（失败也计数），超出 → RateLimitError
 */
export class ObjectionService {
  #attempts = new Map<number, number[]>()

  async submit(
    user: User,
    round: Round,
    targetCandidateId: number,
    reason: string
  ): Promise<Objection> {
    if (round.status !== 'objection') {
      throw new ObjectionPhaseError('Objections are only accepted during the objection window')
    }

    this.#rateLimit(user.id)

    const recent = await Objection.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .first()
    if (recent && recent.createdAt.plus({ hours: OBJECTION_COOLDOWN_HOURS }) > DateTime.now()) {
      throw new CooldownError('You can submit another objection in up to 2 hours')
    }

    const target = await Candidate.query()
      .where('id', targetCandidateId)
      .where('roundId', round.id)
      .where('status', 'approved')
      .first()
    if (!target) {
      throw new InvalidTargetError('Target candidate is not a winner of this round')
    }

    return Objection.create({
      userId: user.id,
      roundId: round.id,
      targetCandidateId,
      reason,
    })
  }

  #rateLimit(userId: number): void {
    const now = Date.now()
    const window = (this.#attempts.get(userId) ?? []).filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    )
    if (window.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      throw new RateLimitError('Too many attempts, please try again later')
    }
    window.push(now)
    this.#attempts.set(userId, window)
  }
}
