import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Round from '#models/round'
import { cleanElectionTables } from '#tests/helpers'
import { RoundScheduler } from '#services/round_scheduler'
import { roundPhasesFor } from '#services/round_window'

test.group('RoundScheduler', (group) => {
  group.each.setup(async () => {
    await cleanElectionTables()
  })

  const NOW = DateTime.fromISO('2026-08-13T12:00:00.000Z', { zone: 'UTC' })

  test('ensureRounds: 从下月起生成 6 个连续月份轮次（跳过特殊轮月 2026-09）', async ({
    assert,
  }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })

    const created = await scheduler.ensureRounds(6)

    assert.equal(created, 5) // 9 月被跳过
    const rows = await Round.query().orderBy('month', 'asc')
    assert.deepEqual(
      rows.map((r) => r.month),
      ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02']
    )
  })

  test('ensureRounds: 幂等——重复调用不新增', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })

    await scheduler.ensureRounds(6)
    const again = await scheduler.ensureRounds(6)

    assert.equal(again, 0)
    assert.equal(
      await Round.query()
        .count('* as c')
        .first()
        .then((r) => Number(r!.$extras.c)),
      5
    )
  })

  test('ensureRounds: 时间戳与纯函数一致（UTC 存储）', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    await scheduler.ensureRounds(2)

    const oct = await Round.findByOrFail('month', '2026-10')
    const phases = roundPhasesFor('2026-10')

    assert.equal(oct.startsAt.toMillis(), phases.startsAt.toUTC().toMillis())
    assert.equal(oct.campaignEndsAt.toMillis(), phases.campaignEndsAt.toUTC().toMillis())
    assert.equal(oct.voting1EndsAt!.toMillis(), phases.voting1EndsAt.toUTC().toMillis())
    assert.equal(oct.voting2EndsAt!.toMillis(), phases.voting2EndsAt.toUTC().toMillis())
    assert.equal(oct.endsAt.toMillis(), phases.endsAt.toUTC().toMillis())
    assert.isFalse(Boolean(oct.special))
  })

  test('ensureRounds 跳过特殊轮月（2026-09 配置）', async ({ assert }) => {
    const scheduler = new RoundScheduler({
      now: () => DateTime.fromISO('2026-08-14T00:00:00.000Z'),
    })

    const created = await scheduler.ensureRounds(3)
    assert.equal(created, 2) // 10 月、11 月（9 月跳过）

    const sep = await Round.findBy('month', '2026-09')
    assert.isNull(sep) // 特殊轮月不生成常规轮
    const oct = await Round.findBy('month', '2026-10')
    assert.isNotNull(oct)
  })

  test('ensureSpecialRounds 按配置自动创建特殊轮（幂等）', async ({ assert }) => {
    const scheduler = new RoundScheduler({
      now: () => DateTime.fromISO('2026-08-14T00:00:00.000Z'),
    })

    const created = await scheduler.ensureSpecialRounds()
    assert.equal(created, 1)
    const round = await Round.findBy('month', '2026-09')
    assert.isNotNull(round)
    assert.equal(round!.special, true)
    // 8/25 00:00 PDT = 8/25 07:00 UTC 开启
    assert.equal(round!.startsAt.toUTC().toISO(), '2026-08-25T07:00:00.000Z')
    // 16h×3 = 48h → 8/27 07:00 UTC 结束
    assert.equal(round!.endsAt.toUTC().toISO(), '2026-08-27T07:00:00.000Z')

    const again = await scheduler.ensureSpecialRounds()
    assert.equal(again, 0) // 幂等
  })

  test('createSpecialRound: 自定义开启时刻 = 投票一开启（竞选开放至投票前），投票 24h+24h', async ({
    assert,
  }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    const startsAt = DateTime.fromISO('2026-08-25T00:00:00.000-07:00', {
      zone: 'America/Los_Angeles',
    })

    const round = await scheduler.createSpecialRound('2026-09', startsAt)

    assert.isTrue(Boolean(round.special))
    assert.equal(round.startsAt.toISO(), startsAt.toUTC().toISO())
    // 竞选截止 = 投票一开启（报名一直开放到投票开始）
    assert.equal(round.campaignEndsAt.toISO(), startsAt.toUTC().toISO())
    assert.equal(round.voting1EndsAt!.toISO(), startsAt.plus({ hours: 24 }).toUTC().toISO())
    assert.equal(round.voting2EndsAt!.toISO(), startsAt.plus({ hours: 48 }).toUTC().toISO())
    assert.equal(round.endsAt.toISO(), startsAt.plus({ hours: 48 }).toUTC().toISO())
  })

  test('createSpecialRound: month 重复 → 拒绝', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    await scheduler.createSpecialRound('2026-09', DateTime.now())

    await assert.rejects(
      () => scheduler.createSpecialRound('2026-09', DateTime.now()),
      /already exists/
    )
  })

  test('fixLegacyPhaseTimes: 旧 16h 结构 campaigning 轮 → 修正为 24+24（仅未开投票的轮）', async ({
    assert,
  }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    const startsAt = DateTime.fromISO('2026-08-25T07:00:00.000Z', { zone: 'UTC' })
    await Round.create({
      month: '2026-09',
      special: true,
      status: 'campaigning',
      startsAt: startsAt.toUTC(),
      campaignEndsAt: startsAt.plus({ hours: 16 }).toUTC(), // 旧结构
      voting1EndsAt: startsAt.plus({ hours: 32 }).toUTC(), // 旧结构
      voting2EndsAt: startsAt.plus({ hours: 48 }).toUTC(),
      endsAt: startsAt.plus({ hours: 48 }).toUTC(),
    })

    const fixed = await scheduler.fixLegacyPhaseTimes()
    assert.equal(fixed, 1)

    const round = await Round.findByOrFail('month', '2026-09')
    assert.equal(round.campaignEndsAt.toUTC().toISO(), startsAt.toUTC().toISO())
    assert.equal(round.voting1EndsAt!.toUTC().toISO(), startsAt.plus({ hours: 24 }).toUTC().toISO())
    assert.equal(round.voting2EndsAt!.toUTC().toISO(), startsAt.plus({ hours: 48 }).toUTC().toISO())
  })

  test('fixLegacyPhaseTimes: 投票进行中（voting1）的轮次不修改', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    const startsAt = DateTime.fromISO('2026-08-25T07:00:00.000Z', { zone: 'UTC' })
    await Round.create({
      month: '2026-10',
      status: 'voting1',
      startsAt: startsAt.toUTC(),
      campaignEndsAt: startsAt.plus({ hours: 16 }).toUTC(),
      voting1EndsAt: startsAt.plus({ hours: 32 }).toUTC(),
      voting2EndsAt: startsAt.plus({ hours: 48 }).toUTC(),
      endsAt: startsAt.plus({ hours: 48 }).toUTC(),
    })

    const fixed = await scheduler.fixLegacyPhaseTimes()
    assert.equal(fixed, 0)

    const round = await Round.findByOrFail('month', '2026-10')
    assert.equal(round.voting1EndsAt!.toUTC().toISO(), startsAt.plus({ hours: 32 }).toUTC().toISO())
  })

  test('特殊轮占用 month 后 ensureRounds 跳过该月', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    await scheduler.createSpecialRound('2026-09', DateTime.now())

    const created = await scheduler.ensureRounds(3)

    assert.equal(created, 2) // 10、11 月创建，9 月被特殊轮占用
    const rows = await Round.query().orderBy('month', 'asc')
    assert.deepEqual(
      rows.map((r) => r.month),
      ['2026-09', '2026-10', '2026-11']
    )
    assert.equal(rows[0].special, 1)
  })
})
