import db from '@adonisjs/lucid/services/db'
import Candidate from '#models/candidate'
import Round from '#models/round'
import User from '#models/user'
import Vote from '#models/vote'
import { LevelGuardService } from './level_guard_service.js'

export class VotingPhaseError extends Error {}
export class IncompleteBallotError extends Error {}
export class DuplicateCandidateError extends Error {}
export class SelfVoteError extends Error {}
export class InvalidCandidateError extends Error {}
export class AlreadyVotedError extends Error {}

const BALLOT_SIZE: Record<1 | 2, number> = { 1: 3, 2: 2 }

/**
 * 投票服务：
 * - phase1 必投满 3 票 / phase2 必投满 2 票，不可重复投同一人、不可投自己
 * - 候选人为该轮 approved（phase2 还需进入前 5）
 * - 一人一阶段只能提交一次（DB 唯一约束兜底并发）
 */
export class VoteService {
  constructor(private readonly guard: LevelGuardService) {}

  async castVotes(user: User, round: Round, phase: 1 | 2, candidateIds: number[]): Promise<Vote[]> {
    const expectedStatus = phase === 1 ? 'voting1' : 'voting2'
    if (round.status !== expectedStatus) {
      throw new VotingPhaseError(`Votes for phase ${phase} are not open`)
    }
    if (!user.zulipUserId) {
      throw new Error('Email not verified / no Zulip identity bound')
    }
    await this.guard.assertLevel(user.zulipUserId, 'silver')

    this.#validateBallot(phase, candidateIds)

    // 该阶段是否已投过
    const existing = await Vote.query()
      .where('userId', user.id)
      .where('roundId', round.id)
      .where('phase', phase)
      .first()
    if (existing) {
      throw new AlreadyVotedError('Already voted in this phase')
    }

    // 候选人与轮次/状态校验
    const candidates = await Candidate.query()
      .whereIn('id', candidateIds)
      .where('roundId', round.id)
      .where('status', 'approved')
    if (candidates.length !== candidateIds.length) {
      throw new InvalidCandidateError('One or more candidates are not eligible')
    }
    if (phase === 2 && candidates.some((c) => !c.enteredVoting2)) {
      throw new InvalidCandidateError('Phase 2 candidates must have advanced from phase 1')
    }

    // 不可投自己
    if (candidates.some((c) => Number(c.userId) === user.id)) {
      throw new SelfVoteError('You cannot vote for yourself')
    }

    const votes: Vote[] = []
    await db.transaction(async (trx) => {
      for (const candidateId of candidateIds) {
        votes.push(
          await Vote.create(
            { userId: user.id, roundId: round.id, phase, candidateId },
            { client: trx }
          )
        )
      }
    })

    return votes
  }

  #validateBallot(phase: 1 | 2, candidateIds: number[]): void {
    const size = BALLOT_SIZE[phase]
    if (candidateIds.length !== size) {
      throw new IncompleteBallotError(`Must cast exactly ${size} votes in phase ${phase}`)
    }
    if (new Set(candidateIds).size !== candidateIds.length) {
      throw new DuplicateCandidateError('Cannot vote for the same candidate twice')
    }
  }
}
