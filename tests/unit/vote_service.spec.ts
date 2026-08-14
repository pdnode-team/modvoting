import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Round from '#models/round'
import Candidate from '#models/candidate'
import {
  VoteService,
  VotingPhaseError,
  IncompleteBallotError,
  DuplicateCandidateError,
  SelfVoteError,
  InvalidCandidateError,
  AlreadyVotedError,
} from '#services/vote_service'
import { LevelGuardService } from '#services/level_guard_service'
import type { DirectoryUser, UserDirectoryProvider } from '#services/directory/types'
import { cleanElectionTables } from '#tests/helpers'

function fakeGuard(levels: Record<number, number | null>): LevelGuardService {
  const provider: UserDirectoryProvider = {
    async fetchByZulipId(id: number) {
      const level = levels[id]
      if (level === undefined || level === null) return null
      return { zulipId: id, name: `u${id}`, totalXp: 0, level, rank: 'x' } as DirectoryUser
    },
    async fetchByName() {
      return null
    },
    async fetchLeaderboard() {
      return []
    },
    async fetchByEmail() {
      return null
    },
  }
  return new LevelGuardService(provider)
}

test.group('VoteService', (group) => {
  let roundCounter = 0

  group.each.setup(async () => {
    roundCounter += 1
    await cleanElectionTables()
  })

  async function makeRound(status = 'voting1', monthOverride?: string): Promise<Round> {
    const base = DateTime.fromISO('2026-09-29T07:00:00.000Z')
    return Round.create({
      month: monthOverride ?? `2026-${String(roundCounter).padStart(2, '0')}`,
      startsAt: base,
      campaignEndsAt: base.plus({ hours: 16 }),
      voting1EndsAt: base.plus({ hours: 32 }),
      voting2EndsAt: base.plus({ hours: 48 }),
      endsAt: base.plus({ hours: 48 }),
      status,
    })
  }

  async function makeUser(zulipId: number, email?: string): Promise<User> {
    return User.create({
      email: email ?? `u${zulipId}@test.com`,
      password: 'x',
      fullName: `User ${zulipId}`,
      zulipUserId: zulipId,
    })
  }

  async function makeCandidates(
    round: Round,
    users: User[],
    opts: { voting2?: boolean } = {}
  ): Promise<Candidate[]> {
    const out: Candidate[] = []
    for (const u of users) {
      out.push(
        await Candidate.create({
          userId: u.id,
          roundId: round.id,
          status: 'approved',
          enteredVoting2: opts.voting2 ?? false,
          answers: '{}',
        })
      )
    }
    return out
  }

  test('正常投票：phase1 投满 3 个不同候选人，落库 3 行', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30, 4: 30 }))
    const round = await makeRound()
    const voters = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3, 4].map((id) => makeUser(id)))
    )

    const votes = await service.castVotes(
      voters,
      round,
      1,
      cands.slice(0, 3).map((c) => c.id)
    )

    assert.lengthOf(votes, 3)
    const rows = await db.from('votes').where('user_id', voters.id).where('round_id', round.id)
    assert.lengthOf(rows, 3)
    assert.isTrue(rows.every((r) => r.phase === 1))
  })

  test('必投满：phase1 只投 2 票 → IncompleteBallotError', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30 }))
    const round = await makeRound()
    const voter = await makeUser(8)
    const cands = await makeCandidates(round, await Promise.all([1, 2].map((id) => makeUser(id))))

    await assert.rejects(
      () =>
        service.castVotes(
          voter,
          round,
          1,
          cands.map((c) => c.id)
        ),
      IncompleteBallotError
    )
  })

  test('重复投同一人 → DuplicateCandidateError', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30 }))
    const round = await makeRound()
    const voter = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3].map((id) => makeUser(id)))
    )

    await assert.rejects(
      () => service.castVotes(voter, round, 1, [cands[0].id, cands[0].id, cands[1].id]),
      DuplicateCandidateError
    )
  })

  test('投自己 → SelfVoteError', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 30, 2: 30, 3: 30 }))
    const round = await makeRound()
    const voter = await makeUser(8)
    const cands = await makeCandidates(round, [voter, await makeUser(2), await makeUser(3)])

    await assert.rejects(
      () =>
        service.castVotes(
          voter,
          round,
          1,
          cands.map((c) => c.id)
        ),
      SelfVoteError
    )
  })

  test('候选人不在该轮/未批准 → InvalidCandidateError', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30 }))
    const round = await makeRound()
    const otherRound = await makeRound('voting1', '2026-08')
    const voter = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3].map((id) => makeUser(id)))
    )
    const [outside] = await makeCandidates(otherRound, [await makeUser(99)])

    await assert.rejects(
      () => service.castVotes(voter, round, 1, [cands[0].id, cands[1].id, outside.id]),
      InvalidCandidateError
    )
  })

  test('phase2 只能投前 5（enteredVoting2）', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30, 4: 30 }))
    const round = await makeRound('voting2')
    const voter = await makeUser(8)
    const users = await Promise.all([1, 2, 3, 4].map((id) => makeUser(id)))
    const cands = await makeCandidates(round, users, { voting2: true })
    const blockedUser = await makeUser(5)
    const blocked = await Candidate.create({
      userId: blockedUser.id,
      roundId: round.id,
      status: 'approved',
      enteredVoting2: false,
      answers: '{}',
    })

    await assert.rejects(
      () => service.castVotes(voter, round, 2, [cands[0].id, blocked.id]),
      InvalidCandidateError
    )
  })

  test('阶段不符：voting1 阶段投 phase2 → VotingPhaseError', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30 }))
    const round = await makeRound('voting1')
    const voter = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3].map((id) => makeUser(id)))
    )

    await assert.rejects(
      () =>
        service.castVotes(
          voter,
          round,
          2,
          cands.slice(0, 2).map((c) => c.id)
        ),
      VotingPhaseError
    )
  })

  test('该阶段已投过 → AlreadyVotedError', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30, 4: 30 }))
    const round = await makeRound()
    const voter = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3, 4].map((id) => makeUser(id)))
    )

    await service.castVotes(
      voter,
      round,
      1,
      cands.slice(0, 3).map((c) => c.id)
    )
    await assert.rejects(
      () =>
        service.castVotes(
          voter,
          round,
          1,
          cands.slice(1, 4).map((c) => c.id)
        ),
      AlreadyVotedError
    )
  })

  test('等级不足（Silver 门槛）→ 拒绝', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 10, 1: 30, 2: 30, 3: 30 }))
    const round = await makeRound()
    const voter = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3].map((id) => makeUser(id)))
    )

    await assert.rejects(
      () =>
        service.castVotes(
          voter,
          round,
          1,
          cands.map((c) => c.id)
        ),
      /Requires silver/
    )
  })

  test('phase2 必投满 2 票', async ({ assert }) => {
    const service = new VoteService(fakeGuard({ 8: 15, 1: 30, 2: 30, 3: 30 }))
    const round = await makeRound('voting2')
    const voter = await makeUser(8)
    const cands = await makeCandidates(
      round,
      await Promise.all([1, 2, 3].map((id) => makeUser(id))),
      {
        voting2: true,
      }
    )

    await assert.rejects(
      () => service.castVotes(voter, round, 2, [cands[0].id]),
      IncompleteBallotError
    )
  })
})
