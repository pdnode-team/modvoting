import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { roundLifecycle } from '#services/election_runtime'
import { RoundScheduler } from '#services/round_scheduler'

/**
 * 启动引导：预生成轮次 + 推进状态机，并每 5 分钟刷新一次。
 * 轮次边界由纯函数保证（UTC 存储），定时器只做"到点推进"。
 * 测试环境跳过（避免邮件发送与数据干扰）。
 */
export default async function bootElections(): Promise<void> {
  if (env.get('NODE_ENV') === 'test') {
    return
  }
  const scheduler = new RoundScheduler()
  await scheduler.ensureRounds(6)
  await scheduler.ensureSpecialRounds()

  await roundLifecycle.refreshAll().catch((error) => {
    logger.error({ err: error }, 'round lifecycle refresh failed')
  })

  setInterval(
    () => {
      roundLifecycle.refreshAll().catch((error) => {
        logger.error({ err: error }, 'round lifecycle refresh failed')
      })
    },
    5 * 60 * 1000
  )
}
