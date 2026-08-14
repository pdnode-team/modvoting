import { RoundLifecycle } from './round_lifecycle.js'
import { notifyResults } from './mail_service.js'

/** 应用级单例：轮次状态机（结果确定后自动邮件通知） */
export const roundLifecycle = new RoundLifecycle({ onResults: notifyResults })
