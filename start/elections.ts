import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { roundLifecycle } from '#services/election_runtime'
import { RoundScheduler } from '#services/round_scheduler'

/**
 * 启动引导（preload 顶层执行——v7 的 preload 只 import 模块，不会调用 default export）：
 * 预生成轮次（含特殊轮）+ 推进状态机。
 * 测试环境跳过（避免邮件发送与数据干扰）。
 *
 * 定时刷新只在 HTTP 服务进程启动（node bin/server.js 或 node ace serve）——
 * 否则 ace 子命令（migration:run 等）会因 setInterval 永不退出。
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

  const isServerProcess = process.argv[1]?.endsWith('server.js') || process.argv.includes('serve')
  if (isServerProcess) {
    setInterval(
      () => {
        roundLifecycle.refreshAll().catch((error) => {
          logger.error({ err: error }, 'round lifecycle refresh failed')
        })
      },
      5 * 60 * 1000
    )
  }
})()
