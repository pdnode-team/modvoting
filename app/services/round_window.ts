import { DateTime } from 'luxon'

export interface RoundPhases {
  startsAt: DateTime
  campaignEndsAt: DateTime
  voting1EndsAt: DateTime
  voting2EndsAt: DateTime
  endsAt: DateTime
}

const ZONE = 'America/Los_Angeles'
const PHASE_HOURS = 16

/**
 * 计算自然月轮次的三阶段时间边界（全为 America/Los_Angeles 时区）。
 *
 * 常规轮规则：month 标识该轮次所属月份，轮次在**下月 1 号 00:00（LA）**结束，
 * 竞选/投票一/投票二各 16 小时，总 48 小时。
 *
 * 禁止手写 UTC 偏移（PDT/PST 随 DST 切换，luxon 按 IANA zone 解析）。
 */
export function roundPhasesFor(month: string): RoundPhases {
  const [year, monthNum] = month.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error(`Invalid month: "${month}" — expected YYYY-MM`)
  }

  const nextMonthYear = monthNum === 12 ? year + 1 : year
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1

  const endsAt = DateTime.fromObject(
    { year: nextMonthYear, month: nextMonth, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
    { zone: ZONE }
  )

  return {
    startsAt: endsAt.minus({ hours: PHASE_HOURS * 3 }),
    campaignEndsAt: endsAt.minus({ hours: PHASE_HOURS * 2 }),
    voting1EndsAt: endsAt.minus({ hours: PHASE_HOURS }),
    voting2EndsAt: endsAt,
    endsAt,
  }
}
