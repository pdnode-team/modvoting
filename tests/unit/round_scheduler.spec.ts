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

  test('ensureRounds: 从下月起生成 6 个连续月份轮次', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })

    const created = await scheduler.ensureRounds(6)

    assert.equal(created, 6)
    const rows = await Round.query().orderBy('month', 'asc')
    assert.deepEqual(
      rows.map((r) => r.month),
      ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']
    )
  })

  test('ensureRounds: 幂等——重复调用不新增', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })

    await scheduler.ensureRounds(6)
    const again = await scheduler.ensureRounds(6)

    assert.equal(again, 0)
    assert.equal(await Round.query().count('* as c').first().then((r) => Number(r!.$extras.c)), 6)
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

  test('createSpecialRound: 自定义开启时刻，三阶段 16h×3', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    const startsAt = DateTime.fromISO('2026-08-25T00:00:00.000-07:00', { zone: 'America/Los_Angeles' })

    const round = await scheduler.createSpecialRound('2026-09', startsAt)

    assert.isTrue(Boolean(round.special))
    assert.equal(round.startsAt.toISO(), startsAt.toUTC().toISO())
    assert.equal(round.campaignEndsAt.toISO(), startsAt.plus({ hours: 16 }).toUTC().toISO())
    assert.equal(round.voting1EndsAt!.toISO(), startsAt.plus({ hours: 32 }).toUTC().toISO())
    assert.equal(round.voting2EndsAt!.toISO(), startsAt.plus({ hours: 48 }).toUTC().toISO())
    assert.equal(round.endsAt.toISO(), startsAt.plus({ hours: 48 }).toUTC().toISO())
  })

  test('createSpecialRound: month 重复 → 拒绝', async ({ assert }) => {
    const scheduler = new RoundScheduler({ now: () => NOW })
    await scheduler.createSpecialRound('2026-09', DateTime.now())

    await assert.rejects(() => scheduler.createSpecialRound('2026-09', DateTime.now()), /already exists/)
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
