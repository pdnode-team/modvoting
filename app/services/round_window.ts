import { DateTime } from 'luxon'

export interface RoundPhases {
  startsAt: DateTime
  campaignEndsAt: DateTime
  voting1EndsAt: DateTime
  voting2EndsAt: DateTime
  endsAt: DateTime
}

const ZONE = 'America/Los_Angeles'
const VOTE_HOURS = 24

/**
 * 计算自然月轮次的阶段时间边界（全为 America/Los_Angeles 时区）。
 *
 * 常规轮规则：month 标识该轮次所属月份，轮次在**下月 1 号 00:00（LA）**结束。
 * 总 48 小时 = 投票一 24h + 投票二 24h；竞选阶段从轮次创建起一直开放
 * （报名随时开放），直到投票一开启（endsAt − 48h）截止。
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
    {
      year: nextMonthYear,
      month: nextMonth,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    { zone: ZONE }
  )

  const voting1EndsAt = endsAt.minus({ hours: VOTE_HOURS })
  const voting1StartsAt = voting1EndsAt.minus({ hours: VOTE_HOURS })

  return {
    startsAt: voting1StartsAt,
    campaignEndsAt: voting1StartsAt,
    voting1EndsAt,
    voting2EndsAt: endsAt,
    endsAt,
  }
}

/**
 * 特殊轮阶段边界（America/Los_Angeles）：startsAt = 配置的开启时刻 = **投票一开启**，
 * 竞选从轮次创建起一直开放（报名随时可交），投票一 24h + 投票二 24h，共 48h。
 */
export function specialRoundPhasesFor(startsAt: DateTime): RoundPhases {
  const voting1StartsAt = startsAt.setZone(ZONE)
  const endsAt = voting1StartsAt.plus({ hours: VOTE_HOURS * 2 })

  return {
    startsAt: voting1StartsAt,
    campaignEndsAt: voting1StartsAt,
    voting1EndsAt: voting1StartsAt.plus({ hours: VOTE_HOURS }),
    voting2EndsAt: endsAt,
    endsAt,
  }
}
