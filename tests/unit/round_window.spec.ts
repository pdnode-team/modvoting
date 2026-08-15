import { test } from '@japa/runner'
import { roundPhasesFor } from '#services/round_window'

test.group('round window — DST 矩阵', () => {
  test('9 月轮：结束 = 10/1 00:00 PDT（UTC 07:00），投票 24h+24h，竞选截止 = 投票一开启', ({
    assert,
  }) => {
    const p = roundPhasesFor('2026-09')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-10-01T07:00:00.000Z')
    assert.equal(p.startsAt.toUTC().toISO(), '2026-09-29T07:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-09-29T07:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-09-30T07:00:00.000Z')
    assert.equal(p.voting2EndsAt.toUTC().toISO(), '2026-10-01T07:00:00.000Z')
  })

  test('10 月轮：结束 = 11/1 00:00 仍为 PDT（UTC 07:00，DST 未结束）', ({ assert }) => {
    const p = roundPhasesFor('2026-10')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-11-01T07:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-10-30T07:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-10-31T07:00:00.000Z')
  })

  test('11 月轮：结束 = 12/1 00:00 PST（UTC 08:00，DST 已结束）', ({ assert }) => {
    const p = roundPhasesFor('2026-11')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-12-01T08:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-11-29T08:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-11-30T08:00:00.000Z')
  })

  test('2 月轮（平年 28 天）：结束 = 3/1 00:00 PST（UTC 08:00）', ({ assert }) => {
    const p = roundPhasesFor('2026-02')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-03-01T08:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-02-27T08:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-02-28T08:00:00.000Z')
  })

  test('3 月轮：结束 = 4/1 00:00 PDT（UTC 07:00，已进夏令时）', ({ assert }) => {
    const p = roundPhasesFor('2026-03')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-04-01T07:00:00.000Z')
  })

  test('12 月轮跨年：month=2026-12 → 结束 2027-01-01 00:00 PST（UTC 08:00）', ({ assert }) => {
    const p = roundPhasesFor('2026-12')

    assert.equal(p.endsAt.toUTC().toISO(), '2027-01-01T08:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-12-31T08:00:00.000Z')
  })

  test('投票两段各 24h（24+24），总 48h；竞选无固定窗口（截止 = 投票一开启）', ({ assert }) => {
    const p = roundPhasesFor('2026-09')

    const d1 = p.voting1EndsAt.diff(p.startsAt, 'hours').hours
    const d2 = p.voting2EndsAt.diff(p.voting1EndsAt, 'hours').hours
    const total = p.endsAt.diff(p.startsAt, 'hours').hours

    assert.equal(d1, 24)
    assert.equal(d2, 24)
    assert.equal(total, 48)
    assert.equal(p.campaignEndsAt.toMillis(), p.startsAt.toMillis())
  })
})
