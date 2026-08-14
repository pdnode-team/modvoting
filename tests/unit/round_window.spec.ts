import { test } from '@japa/runner'
import { roundPhasesFor } from '#services/round_window'

test.group('round window — DST 矩阵', () => {
  test('9 月轮：结束 = 10/1 00:00 PDT（UTC 07:00），三段各 16h', ({ assert }) => {
    const p = roundPhasesFor('2026-09')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-10-01T07:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-09-29T23:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-09-30T15:00:00.000Z')
    assert.equal(p.voting2EndsAt.toUTC().toISO(), '2026-10-01T07:00:00.000Z')
  })

  test('10 月轮：结束 = 11/1 00:00 仍为 PDT（UTC 07:00，DST 未结束）', ({ assert }) => {
    const p = roundPhasesFor('2026-10')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-11-01T07:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-10-30T23:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-10-31T15:00:00.000Z')
  })

  test('11 月轮：结束 = 12/1 00:00 PST（UTC 08:00，DST 已结束）', ({ assert }) => {
    const p = roundPhasesFor('2026-11')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-12-01T08:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-11-30T00:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-11-30T16:00:00.000Z')
  })

  test('2 月轮（平年 28 天）：结束 = 3/1 00:00 PST（UTC 08:00）', ({ assert }) => {
    const p = roundPhasesFor('2026-02')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-03-01T08:00:00.000Z')
    assert.equal(p.campaignEndsAt.toUTC().toISO(), '2026-02-28T00:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-02-28T16:00:00.000Z')
  })

  test('3 月轮：结束 = 4/1 00:00 PDT（UTC 07:00，已进夏令时）', ({ assert }) => {
    const p = roundPhasesFor('2026-03')

    assert.equal(p.endsAt.toUTC().toISO(), '2026-04-01T07:00:00.000Z')
  })

  test('12 月轮跨年：month=2026-12 → 结束 2027-01-01 00:00 PST（UTC 08:00）', ({ assert }) => {
    const p = roundPhasesFor('2026-12')

    assert.equal(p.endsAt.toUTC().toISO(), '2027-01-01T08:00:00.000Z')
    assert.equal(p.voting1EndsAt.toUTC().toISO(), '2026-12-31T16:00:00.000Z')
  })

  test('段差恒为 16h，总 48h', ({ assert }) => {
    const p = roundPhasesFor('2026-09')

    const d1 = p.voting1EndsAt.diff(p.campaignEndsAt, 'hours').hours
    const d2 = p.voting2EndsAt.diff(p.voting1EndsAt, 'hours').hours
    const campaign = p.campaignEndsAt.diff(p.startsAt, 'hours').hours
    const total = p.endsAt.diff(p.startsAt, 'hours').hours

    assert.equal(campaign, 16)
    assert.equal(d1, 16)
    assert.equal(d2, 16)
    assert.equal(total, 48)
  })
})
