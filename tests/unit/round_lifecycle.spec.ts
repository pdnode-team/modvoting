import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Round from '#models/round'
import Candidate from '#models/candidate'
import TieBreak from '#models/tie_break'
import { RoundLifecycle } from '#services/round_lifecycle'
import { ResultService } from '#services/result_service'
import { cleanElectionTables } from '#tests/helpers'

function at(iso: string): DateTime {
  return DateTime.fromISO(iso, { zone: 'UTC' })
}

const NOW_SQL = () => DateTime.now().toSQL()

test.group('RoundLifecycle', (group) => {
  group.each.setup(async () => {
    await cleanElectionTables()
  })

  async function makeRound(overrides: Partial<Round> = {}): Promise<Round> {
    const base = at('2026-09-29T07:00:00.000Z')
    return Round.create({
      month: overrides.month ?? `2026-09`,
      startsAt: base,
      campaignEndsAt: base.plus({ hours: 16 }),
      voting1EndsAt: base.plus({ hours: 32 }),
      voting2EndsAt: base.plus({ hours: 48 }),
      endsAt: base.plus({ hours: 48 }),
      status: 'campaigning',
      mode: 'undecided',
      ...overrides,
    })
  }

  async function makeUser(zulipId: number): Promise<User> {
    // raw insert 绕过 scrypt hash hook（测试提速），返回模型实例
    await db.table('users').insert({
      email: `u${zulipId}@t.com`,
      password: 'x',
      full_name: `U${zulipId}`,
      zulip_user_id: zulipId,
      created_at: NOW_SQL(),
    })
    const row = await db.from('users').where('zulip_user_id', zulipId).first()
    return User.findOrFail(row!.id)
  }

  async function addCandidates(round: Round, zulipIds: number[]): Promise<Candidate[]> {
    const out: Candidate[] = []
    for (const z of zulipIds) {
      const u = await makeUser(z)
      out.push(
        await Candidate.create({
          userId: u.id,
          roundId: round.id,
          status: 'approved',
          answers: '{}',
        })
      )
    }
    return out
  }

  async function cast(round: Round, voterZulip: number, phase: 1 | 2, candidateIds: number[]) {
    const voter = await makeUser(voterZulip)
    for (const cid of candidateIds) {
      await db.table('votes').insert({
        user_id: voter.id,
        round_id: round.id,
        phase,
        candidate_id: cid,
        created_at: NOW_SQL(),
      })
    }
  }

  test('竞选结束 ≤3 人 → acclamation + objection（免投票）', async ({ assert }) => {
    const round = await makeRound()
    await addCandidates(round, [1, 2])
    const lifecycle = new RoundLifecycle({ now: () => at('2026-09-29T23:30:00.000Z') }) // 竞选后

    await lifecycle.refresh(round)

    await round.refresh()
    assert.equal(round.mode, 'acclamation')
    assert.equal(round.status, 'objection')
  })

  test('竞选结束 >3 人 → election + voting1', async ({ assert }) => {
    const round = await makeRound()
    await addCandidates(round, [1, 2, 3, 4])
    const lifecycle = new RoundLifecycle({ now: () => at('2026-09-29T23:30:00.000Z') })

    await lifecycle.refresh(round)
    await round.refresh()

    assert.equal(round.mode, 'election')
    assert.equal(round.status, 'voting1')
  })

  test('voting1 结束 → Top5 进二轮（enteredVoting2），status=voting2', async ({ assert }) => {
    const round = await makeRound({ status: 'voting1', mode: 'election' })
    const cands = await addCandidates(round, [1, 2, 3, 4, 5, 6])
    // 票数：c0=5, c1=4, c2=3, c3=2, c4=1, c5=0
    const votes: Array<[number, number]> = [
      [10, 0],
      [11, 0],
      [12, 0],
      [13, 0],
      [14, 0],
      [20, 1],
      [21, 1],
      [22, 1],
      [23, 1],
      [30, 2],
      [31, 2],
      [32, 2],
      [40, 3],
      [41, 3],
      [50, 4],
    ]
    for (const [zid, idx] of votes) await cast(round, zid, 1, [cands[idx].id])

    const lifecycle = new RoundLifecycle({ now: () => at('2026-09-30T23:30:00.000Z') }) // voting1 后
    await lifecycle.refresh(round)
    await round.refresh()

    assert.equal(round.status, 'voting2')
    const advanced = await Candidate.query()
      .where('roundId', round.id)
      .where('enteredVoting2', true)
      .preload('user')
    assert.lengthOf(advanced, 5)
    const zulipIds = advanced.map((c) => Number(c.user.zulipUserId)).sort()
    assert.deepEqual(zulipIds, [1, 2, 3, 4, 5])
  })

  test('voting1 平票：第 5 名位置平票 → 随机补位并记录 tie_breaks', async ({ assert }) => {
    const round = await makeRound({ status: 'voting1', mode: 'election' })
    const cands = await addCandidates(round, [1, 2, 3, 4, 5, 6])
    // c0=10, c1=9, c2=8, c3=7, c4=6, c5=6 → 5/6 名平票 6
    const votes: Array<[number, number]> = [
      [10, 0],
      [11, 0],
      [12, 0],
      [13, 0],
      [14, 0],
      [15, 0],
      [16, 0],
      [17, 0],
      [18, 0],
      [19, 0],
      [20, 1],
      [21, 1],
      [22, 1],
      [23, 1],
      [24, 1],
      [25, 1],
      [26, 1],
      [27, 1],
      [28, 1],
      [30, 2],
      [31, 2],
      [32, 2],
      [33, 2],
      [34, 2],
      [35, 2],
      [36, 2],
      [37, 2],
      [40, 3],
      [41, 3],
      [42, 3],
      [43, 3],
      [44, 3],
      [45, 3],
      [46, 3],
      [50, 4],
      [51, 4],
      [52, 4],
      [53, 4],
      [54, 4],
      [55, 4],
      [60, 5],
      [61, 5],
      [62, 5],
      [63, 5],
      [64, 5],
      [65, 5],
    ]
    for (const [zid, idx] of votes) await cast(round, zid, 1, [cands[idx].id])

    const lifecycle = new RoundLifecycle({ now: () => at('2026-09-30T23:30:00.000Z') })
    await lifecycle.refresh(round)
    await round.refresh()

    const advanced = await Candidate.query()
      .where('roundId', round.id)
      .where('enteredVoting2', true)
    assert.lengthOf(advanced, 5)

    const tieBreak = await TieBreak.query()
      .where('roundId', round.id)
      .where('stage', 'top5')
      .first()
    assert.isNotNull(tieBreak)
    const ids = JSON.parse(tieBreak!.candidateIds)
    assert.deepEqual(ids.sort(), [cands[4].id, cands[5].id].sort())
    assert.lengthOf(JSON.parse(tieBreak!.selectedIds), 1)
  })

  test('voting2 结束 → Top3 当选（status=closed）', async ({ assert }) => {
    const round = await makeRound({ status: 'voting2', mode: 'election' })
    const cands = await addCandidates(round, [1, 2, 3, 4, 5])
    for (const c of cands.slice(0, 3)) c.enteredVoting2 = true
    for (const c of cands) await c.save()

    const votes: Array<[number, number]> = [
      [10, 0],
      [11, 0],
      [12, 0],
      [20, 1],
      [21, 1],
      [30, 2],
    ]
    for (const [zid, idx] of votes) await cast(round, zid, 2, [cands[idx].id])

    const lifecycle = new RoundLifecycle({ now: () => at('2026-10-01T08:00:00.000Z') }) // 结束后
    await lifecycle.refresh(round)
    await round.refresh()

    assert.equal(round.status, 'closed')

    const results = await new ResultService().resultsFor(round)
    assert.deepEqual(
      results.winners.map((w) => Number(w.candidate.user.zulipUserId)),
      [1, 2, 3]
    )
  })

  test('voting2 平票：Top3 位置平票 → 随机并记录 tie_breaks', async ({ assert }) => {
    const round = await makeRound({ status: 'voting2', mode: 'election' })
    const cands = await addCandidates(round, [1, 2, 3, 4])
    for (const c of cands) {
      c.enteredVoting2 = true
      await c.save()
    }
    // c0=4, c1=3, c2=1, c3=1 → 3/4 名平票 1
    const votes: Array<[number, number]> = [
      [10, 0],
      [11, 0],
      [12, 0],
      [13, 0],
      [20, 1],
      [21, 1],
      [22, 1],
      [30, 2],
      [40, 3],
    ]
    for (const [zid, idx] of votes) await cast(round, zid, 2, [cands[idx].id])

    const lifecycle = new RoundLifecycle({ now: () => at('2026-10-01T08:00:00.000Z') })
    await lifecycle.refresh(round)
    await round.refresh()

    const winners = await new ResultService().resultsFor(round)
    assert.lengthOf(winners.winners, 3)

    const tieBreak = await TieBreak.query()
      .where('roundId', round.id)
      .where('stage', 'winners')
      .first()
    assert.isNotNull(tieBreak)
  })

  test('objection 阶段到 ends_at → closed', async ({ assert }) => {
    const round = await makeRound({ status: 'objection', mode: 'acclamation' })
    const lifecycle = new RoundLifecycle({ now: () => at('2026-10-01T08:00:00.000Z') })

    await lifecycle.refresh(round)
    await round.refresh()

    assert.equal(round.status, 'closed')
  })
})
