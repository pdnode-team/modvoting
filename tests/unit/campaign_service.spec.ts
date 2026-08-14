import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import Round from '#models/round'
import Candidate from '#models/candidate'
import { cleanElectionTables } from '#tests/helpers'
import {
  CampaignService,
  CampaignClosedError,
  AlreadyAppliedError,
  CampaignFullError,
  QuestionnaireError,
} from '#services/campaign_service'
import { LevelGuardService } from '#services/level_guard_service'
import type { DirectoryUser, UserDirectoryProvider } from '#services/directory/types'

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

const VALID_ANSWERS = { months: 12, opinions: { 'MSCRWT': 'great', '小狗 2.0': 'ok' } }

test.group('CampaignService', (group) => {
  group.each.setup(async () => {
    await cleanElectionTables()
  })

  async function makeRound(status = 'campaigning'): Promise<Round> {
    const base = DateTime.fromISO('2026-09-29T07:00:00.000Z')
    return Round.create({
      month: '2026-09',
      startsAt: base,
      campaignEndsAt: base.plus({ hours: 16 }),
      voting1EndsAt: base.plus({ hours: 32 }),
      voting2EndsAt: base.plus({ hours: 48 }),
      endsAt: base.plus({ hours: 48 }),
      status,
    })
  }

  async function makeUser(zulipId: number, email = `u${zulipId}@test.com`): Promise<User> {
    return User.create({
      email,
      password: 'x',
      fullName: `User ${zulipId}`,
      zulipUserId: zulipId,
    })
  }

  test('成功报名：approved + 问卷 JSON 往返', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 8: 30 }))
    const round = await makeRound()
    const user = await makeUser(8)

    const candidate = await service.apply(user, round, VALID_ANSWERS)

    assert.equal(candidate.status, 'approved')
    const parsed = service.parseAnswers(candidate)
    assert.deepEqual(parsed, VALID_ANSWERS)

    const row = await Candidate.findByOrFail('id', candidate.id)
    assert.equal(Number(row.userId), user.id)
    assert.equal(Number(row.roundId), round.id)
  })

  test('重复报名 → AlreadyAppliedError', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 8: 30 }))
    const round = await makeRound()
    const user = await makeUser(8)

    await service.apply(user, round, VALID_ANSWERS)
    await assert.rejects(() => service.apply(user, round, VALID_ANSWERS), AlreadyAppliedError)
  })

  test('竞选池满 10 人 → CampaignFullError', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 999: 30 }), [], 10)
    const round = await makeRound()

    // 造 10 个已报名用户
    for (let i = 1; i <= 10; i++) {
      const u = await makeUser(100 + i, `u${100 + i}@test.com`)
      await Candidate.create({ userId: u.id, roundId: round.id, answers: '{}' })
    }

    const newcomer = await makeUser(999, 'new@test.com')
    await assert.rejects(() => service.apply(newcomer, round, VALID_ANSWERS), CampaignFullError)
  })

  test('非 campaigning 阶段 → CampaignClosedError', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 8: 30 }))
    const round = await makeRound('voting1')
    const user = await makeUser(8)

    await assert.rejects(() => service.apply(user, round, VALID_ANSWERS), CampaignClosedError)
  })

  test('等级不足（Titanium 门槛）→ 拒绝', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 8: 25 }))
    const round = await makeRound()
    const user = await makeUser(8)

    await assert.rejects(() => service.apply(user, round, VALID_ANSWERS))
  })

  test('未绑定 Zulip 用户 → 拒绝', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({}))
    const round = await makeRound()
    const user = await makeUser(8)
    user.zulipUserId = null

    await assert.rejects(() => service.apply(user, round, VALID_ANSWERS))
  })

  test('问卷缺评价 → QuestionnaireError', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 8: 30 }))
    const round = await makeRound()
    const user = await makeUser(8)

    await assert.rejects(
      () => service.apply(user, round, { months: 12, opinions: { MSCRWT: 'great' } }),
      QuestionnaireError
    )
  })

  test('问卷 months 非正整数 → QuestionnaireError', async ({ assert }) => {
    const service = new CampaignService(fakeGuard({ 8: 30 }))
    const round = await makeRound()
    const user = await makeUser(8)

    await assert.rejects(
      () => service.apply(user, round, { months: 0, opinions: VALID_ANSWERS.opinions }),
      QuestionnaireError
    )
  })
})
