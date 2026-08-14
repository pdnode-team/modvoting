import { DateTime } from 'luxon'
import Round from '#models/round'
import { electionConfig } from '#config/elections'
import { roundPhasesFor } from './round_window.js'

interface RoundSchedulerOptions {
  /** 可注入的当前时间（测试用），默认 DateTime.now() */
  now?: () => DateTime
}

/**
 * 轮次预生成：
 * - ensureRounds: 从下月起生成未来 N 个自然月的常规轮（幂等，跳过已有 month 与特殊轮月）
 * - ensureSpecialRounds: 按配置自动创建特殊轮（幂等；特殊轮月不生成常规轮）
 * - createSpecialRound: 手动创建特殊轮（自定义开启时刻，三阶段 16h×3）
 */
export class RoundScheduler {
  readonly #now: () => DateTime

  constructor(options: RoundSchedulerOptions = {}) {
    this.#now = options.now ?? (() => DateTime.now())
  }

  async ensureRounds(horizonMonths = 6): Promise<number> {
    const now = this.#now()
    let year = now.year
    let month = now.month + 1
    let created = 0

    for (let i = 0; i < horizonMonths; i++) {
      if (month > 12) {
        month = 1
        year += 1
      }
      const monthKey = `${year}-${String(month).padStart(2, '0')}`

      // 特殊轮月：不生成常规轮（由 ensureSpecialRounds 创建）
      if (!(monthKey in electionConfig.specialRounds)) {
        const exists = await Round.findBy('month', monthKey)
        if (!exists) {
          const p = roundPhasesFor(monthKey)
          await Round.create({
            month: monthKey,
            startsAt: p.startsAt.toUTC(),
            campaignEndsAt: p.campaignEndsAt.toUTC(),
            voting1EndsAt: p.voting1EndsAt.toUTC(),
            voting2EndsAt: p.voting2EndsAt.toUTC(),
            endsAt: p.endsAt.toUTC(),
          })
          created += 1
        }
      }

      month += 1
    }

    return created
  }

  /** 按 config/elections.ts 的 specialRounds 自动创建特殊轮（幂等）。 */
  async ensureSpecialRounds(): Promise<number> {
    let created = 0
    for (const [month, startsAtLocal] of Object.entries(electionConfig.specialRounds)) {
      const existing = await Round.findBy('month', month)
      if (!existing) {
        const startsAt = DateTime.fromISO(startsAtLocal, { zone: 'America/Los_Angeles' })
        await this.createSpecialRound(month, startsAt)
        created += 1
      }
    }
    return created
  }

  async createSpecialRound(month: string, startsAt: DateTime): Promise<Round> {
    const existing = await Round.findBy('month', month)
    if (existing) {
      throw new Error(`Round for ${month} already exists`)
    }

    const endsAt = startsAt.plus({ hours: 48 })

    return Round.create({
      month,
      startsAt: startsAt.toUTC(),
      campaignEndsAt: startsAt.plus({ hours: 16 }).toUTC(),
      voting1EndsAt: startsAt.plus({ hours: 32 }).toUTC(),
      voting2EndsAt: endsAt.toUTC(),
      endsAt: endsAt.toUTC(),
      special: true,
    })
  }
}
