import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Round from '#models/round'
import Candidate from '#models/candidate'
import { cleanElectionTables } from '#tests/helpers'
import {
  ObjectionService,
  ObjectionPhaseError,
  InvalidTargetError,
  CooldownError,
  RateLimitError,
} from '#services/objection_service'

const NOW_SQL = () => DateTime.now().toSQL()

test.group('ObjectionService', (group) => {
  group.each.setup(async () => {
    await cleanElectionTables()
  })

  async function makeUser(zulipId: number): Promise<User> {
    await db.table('users').insert({
      email: `o${zulipId}@t.com`,
      password: 'x',
      full_name: `O${zulipId}`,
      zulip_user_id: zulipId,
      created_at: NOW_SQL(),
    })
    const row = await db.from('users').where('zulip_user_id', zulipId).first()
    return User.findOrFail(row!.id)
  }

  async function makeRound(status = 'objection', monthOverride?: string): Promise<Round> {
    const base = DateTime.fromISO('2026-09-29T07:00:00.000Z')
    return Round.create({
      month: monthOverride ?? '2026-09',
      startsAt: base,
      campaignEndsAt: base.plus({ hours: 16 }),
      voting1EndsAt: base.plus({ hours: 32 }),
      voting2EndsAt: base.plus({ hours: 48 }),
      endsAt: base.plus({ hours: 48 }),
      status,
      mode: 'acclamation',
    })
  }

  test('公示期提交异议成功', async ({ assert }) => {
    const service = new ObjectionService()
    const round = await makeRound()
    const winner = await makeUser(1)
    const cand = await Candidate.create({
      userId: winner.id,
      roundId: round.id,
      status: 'approved',
      answers: '{}',
    })
    const objector = await makeUser(2)

    const objection = await service.submit(objector, round, cand.id, 'He is inactive')

    assert.equal(objection.reason, 'He is inactive')
    assert.equal(Number(objection.targetCandidateId), cand.id)
    const rows = await db.from('objections').where('user_id', objector.id)
    assert.lengthOf(rows, 1)
  })

  test('非公示期 → ObjectionPhaseError', async ({ assert }) => {
    const service = new ObjectionService()
    const round = await makeRound('closed')
    const winner = await makeUser(1)
    const cand = await Candidate.create({
      userId: winner.id,
      roundId: round.id,
      status: 'approved',
      answers: '{}',
    })
    const objector = await makeUser(2)

    await assert.rejects(() => service.submit(objector, round, cand.id, 'x'), ObjectionPhaseError)
  })

  test('目标不是该轮当选者 → InvalidTargetError', async ({ assert }) => {
    const service = new ObjectionService()
    const round = await makeRound()
    const otherRound = await makeRound('objection', '2026-08')
    const loser = await makeUser(1)
    const cand = await Candidate.create({
      userId: loser.id,
      roundId: otherRound.id,
      status: 'approved',
      answers: '{}',
    })
    const objector = await makeUser(2)

    await assert.rejects(() => service.submit(objector, round, cand.id, 'x'), InvalidTargetError)
  })

  test('2h 冷却：成功后再次提交 → CooldownError', async ({ assert }) => {
    const service = new ObjectionService()
    const round = await makeRound()
    const winner = await makeUser(1)
    const cand = await Candidate.create({
      userId: winner.id,
      roundId: round.id,
      status: 'approved',
      answers: '{}',
    })
    const objector = await makeUser(2)

    await service.submit(objector, round, cand.id, 'first')
    await assert.rejects(() => service.submit(objector, round, cand.id, 'second'), CooldownError)
  })

  test('限速：10 分钟窗口内超过 5 次尝试 → RateLimitError', async ({ assert }) => {
    const service = new ObjectionService()
    const round = await makeRound()
    const winner = await makeUser(1)
    const cand = await Candidate.create({
      userId: winner.id,
      roundId: round.id,
      status: 'approved',
      answers: '{}',
    })
    const objector = await makeUser(2)

    // 前 5 次：第 1 次成功（冷却生效），2-5 次因冷却被拒（仍计入限速）
    for (let i = 0; i < 5; i++) {
      await service.submit(objector, round, cand.id, `try ${i}`).catch(() => {})
    }
    await assert.rejects(
      () => service.submit(objector, round, cand.id, 'over limit'),
      RateLimitError
    )
  })

  test('不同用户互不影响', async ({ assert }) => {
    const service = new ObjectionService()
    const round = await makeRound()
    const winner = await makeUser(1)
    const cand = await Candidate.create({
      userId: winner.id,
      roundId: round.id,
      status: 'approved',
      answers: '{}',
    })
    const objectorA = await makeUser(2)
    const objectorB = await makeUser(3)

    await service.submit(objectorA, round, cand.id, 'from A')
    await assert.doesNotReject(() => service.submit(objectorB, round, cand.id, 'from B'))
  })
})
