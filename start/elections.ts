import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { roundLifecycle } from '#services/election_runtime'
import { RoundScheduler } from '#services/round_scheduler'

/**
 * 启动引导（preload 顶层执行——v7 的 preload 只 import 模块，不会调用 default export）：
 * 预生成轮次（含特殊轮）+ 推进状态机，并每 5 分钟刷新一次。
 * 测试环境跳过（避免邮件发送与数据干扰）。
 */
void (async () => {
  if (env.get('NODE_ENV') === 'test') {
    return
  }

  const scheduler = new RoundScheduler()

  try {
    await scheduler.ensureRounds(6)
    await scheduler.ensureSpecialRounds()
    await roundLifecycle.refreshAll()
  } catch (error) {
    logger.error({ err: error }, 'election bootstrap failed')
  }

  setInterval(
    () => {
      roundLifecycle.refreshAll().catch((error) => {
        logger.error({ err: error }, 'round lifecycle refresh failed')
      })
    },
    5 * 60 * 1000
  )
})()
