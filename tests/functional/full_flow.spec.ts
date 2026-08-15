import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Round from '#models/round'
import Candidate from '#models/candidate'
import Vote from '#models/vote'
import TieBreak from '#models/tie_break'
import { cleanElectionTables } from '#tests/helpers'
import { RoundLifecycle } from '#services/round_lifecycle'
import { CampaignService } from '#services/campaign_service'
import { VoteService } from '#services/vote_service'
import { ResultService } from '#services/result_service'
import { LevelGuardService } from '#services/level_guard_service'
import type { UserDirectoryProvider, DirectoryUser } from '#services/directory/types'

/** 等级映射 fake：zulipId -> level（无则 null） */
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
    async fetchByEmail() {
      return null
    },
    async fetchLeaderboard() {
      return []
    },
  }
  return new LevelGuardService(provider)
}

test.group('Full election flow (end-to-end)', (group) => {
  group.each.setup(async () => {
    await cleanElectionTables()
  })

  test('>3 候选人：报名→投票一→Top5→投票二→Top3→结果', async ({ assert }) => {
    const guard = fakeGuard(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 30])))
    const campaign = new CampaignService(guard)
    const vote = new VoteService(guard, false) // 等级检查关闭
    const campaignEnd = new RoundLifecycle({ now: () => NOW.plus({ hours: 1 }) })
    const voting1End = new RoundLifecycle({ now: () => NOW.plus({ hours: 17 }) })
    const voting2End = new RoundLifecycle({ now: () => NOW.plus({ hours: 33 }) })

    // 1. 轮次：campaigning（总 48h，结束 = NOW+48h）
    const round = await Round.create({
      month: '2026-09',
      status: 'campaigning',
      startsAt: NOW.minus({ hours: 20 }),
      campaignEndsAt: NOW.minus({ hours: 1 }),
      voting1EndsAt: NOW.plus({ hours: 16 }),
      voting2EndsAt: NOW.plus({ hours: 32 }),
      endsAt: NOW.plus({ hours: 48 }),
      special: true,
    })

    // 2. 创建 10 个用户（zulip 1-10）
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        User.create({
          email: `u${i + 1}@t.com`,
          password: 'x',
          fullName: `User ${i + 1}`,
          zulipUserId: i + 1,
        })
      )
    )

    // 3. 6 人报名（真实 CampaignService：问卷 + Titanium）
    const applicants = users.slice(0, 6)
    for (const u of applicants) {
      await campaign.apply(u, round, {
        months: 12,
        opinions: { 'MSCRWT': 5, '小狗 2.0': 4 },
      })
    }
    assert.equal(
      await Candidate.query()
        .where('roundId', round.id)
        .count('* as c')
        .then((r) => Number(r[0].$extras.c)),
      6
    )

    // 4. 竞选结束 → voting1（6 > 3，走两轮投票）
    await campaignEnd.refresh(round)
    await round.refresh()
    assert.equal(round.status, 'voting1')
    assert.equal(round.mode, 'election')

    // 5. 全部 10 人投满 3 票（分散投票，制造可能的平票）
    const candidates = await Candidate.query().where('roundId', round.id).orderBy('id', 'asc')
    for (const u of users) {
      const picks = candidates
        .filter((c) => c.userId !== u.id)
        .slice(0, 3)
        .map((c) => c.id)
      await vote.castVotes(u, round, 1, picks)
    }
    const v1 = await Vote.query()
      .where('roundId', round.id)
      .where('phase', 1)
      .count('* as c')
      .then((r) => Number(r[0].$extras.c))
    assert.equal(v1, 30) // 10 人 × 3 票

    // 6. 投票一结束 → voting2（Top5 进二轮；0 票候选不入选是合理行为）
    await voting1End.refresh(round)
    await round.refresh()
    assert.equal(round.status, 'voting2')
    const advanced = await Candidate.query()
      .where('roundId', round.id)
      .where('enteredVoting2', true)
    assert.isAtLeast(advanced.length, 4)
    assert.isAtMost(advanced.length, 5)

    // 7. 二轮：每人 2 票（只投 Top5）
    const top5 = advanced
    for (const u of users) {
      const picks = top5
        .filter((c) => c.userId !== u.id)
        .slice(0, 2)
        .map((c) => c.id)
      await vote.castVotes(u, round, 2, picks)
    }

    // 8. 投票二结束 → closed + 结果
    await voting2End.refresh(round)
    await round.refresh()
    assert.equal(round.status, 'closed')

    const results = await new ResultService().resultsFor(round)
    assert.equal(results.winners.length, 3)
    assert.isAtLeast(results.phase1.length, 4) // 0 票候选不出现在 tally
    assert.isAtMost(results.phase1.length, 6)
    assert.isAtLeast(results.phase2.length, 3) // 二轮 0 票候选同样不出现在 tally
    assert.isAtMost(results.phase2.length, advanced.length)
    // winners 必须是 Top5 里出来的
    const top5Ids = new Set(top5.map((c) => c.id))
    for (const w of results.winners) {
      assert.isTrue(top5Ids.has(w.candidate.id))
    }
  })

  test('≤3 候选人：免投票直接当选 + 公示期异议', async ({ assert }) => {
    const guard = fakeGuard({ 1: 30, 2: 30, 3: 30 })
    const campaign = new CampaignService(guard)
    const campaignEnd = new RoundLifecycle({ now: () => NOW.plus({ hours: 1 }) })
    const objectionEnd = new RoundLifecycle({ now: () => NOW.plus({ hours: 49 }) })

    const round = await Round.create({
      month: '2026-09',
      status: 'campaigning',
      startsAt: NOW.minus({ hours: 20 }),
      campaignEndsAt: NOW.minus({ hours: 1 }),
      voting1EndsAt: NOW.plus({ hours: 16 }),
      voting2EndsAt: NOW.plus({ hours: 32 }),
      endsAt: NOW.plus({ hours: 48 }),
    })

    const users = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        User.create({
          email: `u${i + 1}@t.com`,
          password: 'x',
          fullName: `U${i + 1}`,
          zulipUserId: i + 1,
        })
      )
    )
    for (const u of users) {
      await campaign.apply(u, round, { months: 6, opinions: { 'MSCRWT': 5, '小狗 2.0': 3 } })
    }

    // 竞选结束 → ≤3 直接当选 + 公示期
    await campaignEnd.refresh(round)
    await round.refresh()
    assert.equal(round.status, 'objection')
    assert.equal(round.mode, 'acclamation')

    // 结果（公示期）：全部当选
    const results = await new ResultService().resultsFor(round)
    assert.equal(results.winners.length, 3)

    // 异议（由外部用户提交，需要该用户绑定 zulip）
    const { ObjectionService } = await import('#services/objection_service')
    const outsider = await User.create({
      email: 'o@t.com',
      password: 'x',
      fullName: 'O',
      zulipUserId: 9,
    })
    const objection = await new ObjectionService().submit(
      outsider,
      round,
      results.winners[0].candidate.id,
      'Test objection reason'
    )
    assert.equal(objection.targetCandidateId, results.winners[0].candidate.id)

    // 公示结束 → closed
    await objectionEnd.refresh(round)
    await round.refresh()
    assert.equal(round.status, 'closed')
  })

  test('平票：投票一第 5 名平票 → 随机 + tie_breaks 记录', async ({ assert }) => {
    const guard = fakeGuard(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, 30])))
    const campaign = new CampaignService(guard)
    const campaignEnd = new RoundLifecycle({ now: () => NOW.plus({ hours: 1 }) })
    const voting1End = new RoundLifecycle({ now: () => NOW.plus({ hours: 17 }) })

    const round = await Round.create({
      month: '2026-09',
      status: 'campaigning',
      startsAt: NOW.minus({ hours: 20 }),
      campaignEndsAt: NOW.minus({ hours: 1 }),
      voting1EndsAt: NOW.plus({ hours: 16 }),
      voting2EndsAt: NOW.plus({ hours: 32 }),
      endsAt: NOW.plus({ hours: 48 }),
    })
    const users = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        User.create({
          email: `u${i + 1}@t.com`,
          password: 'x',
          fullName: `U${i + 1}`,
          zulipUserId: i + 1,
        })
      )
    )
    for (const u of users.slice(0, 6)) {
      await campaign.apply(u, round, { months: 12, opinions: { 'MSCRWT': 5, '小狗 2.0': 4 } })
    }
    await campaignEnd.refresh(round)
    await round.refresh()

    // 人为制造平票：cand 0/1/2 各 8 票，cand 3/4/5 各 5 票 → 第 5 名位置 3 人平票
    // 直接插票（绕过 ballot 校验）保证精确计数
    const candidates = await Candidate.query().where('roundId', round.id).orderBy('id', 'asc')
    const rawInsert = db.table('votes')
    const nowSQL = NOW.toSQL()
    for (const [candIdx, voterCount] of [
      [0, 8],
      [1, 8],
      [2, 8],
      [3, 5],
      [4, 5],
      [5, 5],
    ] as const) {
      for (let v = 0; v < voterCount; v++) {
        const voter = users[(v + candIdx * 2) % 8]
        await rawInsert.insert({
          user_id: voter.id,
          round_id: round.id,
          phase: 1,
          candidate_id: candidates[candIdx].id,
          created_at: nowSQL,
        })
      }
    }

    await voting1End.refresh(round)
    await round.refresh()
    assert.equal(round.status, 'voting2')

    const tieBreak = await TieBreak.query()
      .where('roundId', round.id)
      .where('stage', 'top5')
      .first()
    assert.isNotNull(tieBreak) // 平票发生了且被记录
    // selectedIds = 平票池随机选中的补位者（need = 5 - locked = 2）
    const pool = JSON.parse(tieBreak!.candidateIds) as number[]
    const chosen = JSON.parse(tieBreak!.selectedIds) as number[]
    assert.equal(pool.length, 3) // 平票池：3 位 5 票候选
    assert.equal(chosen.length, 2) // 随机选中 2 人补位
    assert.isNotEmpty(chosen.filter((id) => pool.includes(id)))
    assert.equal(
      await Candidate.query()
        .where('roundId', round.id)
        .where('enteredVoting2', true)
        .count('* as c')
        .then((r) => Number(r[0].$extras.c)),
      5
    )
  })
})

const NOW = DateTime.fromISO('2026-08-14T12:00:00.000Z')
