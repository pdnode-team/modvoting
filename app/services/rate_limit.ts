import { InMemoryRateLimiter } from './rate_limiter.js'

/**
 * 应用级限速器（进程内滑动窗口）。
 *
 * 键策略（key 前缀避免冲突）：
 *  - verify:email:{email} — 邮箱验证请求（防刷验证邮件）
 *  - campaign:user:{zulipId} — 报名（同一用户 1 次就够）
 *  - vote:user:{zulipId}:round:{roundId} — 投票（多次提交会被拦）
 *  - objection:user:{zulipId} — 异议（与 ObjectionService 自带 2h 冷却叠加）
 */
export const rateLimiters = {
  verify: new InMemoryRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 }), // 10min 5 次
  campaign: new InMemoryRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 }), // 1h 3 次
  vote: new InMemoryRateLimiter({ limit: 5, windowMs: 60 * 1000 }), // 1min 5 次
  objection: new InMemoryRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 }), // 1h 10 次
}

export class RateLimitedError extends Error {
  constructor(
    public readonly scope: keyof typeof rateLimiters,
    public readonly resetInMs: number
  ) {
    super(`Too many requests (${scope}); retry in ${Math.ceil(resetInMs / 1000)}s`)
  }
}

/** 通用 helper：限速不通过则抛 RateLimitedError（控制器 catch 渲染 429） */
export function checkLimit(
  scope: keyof typeof rateLimiters,
  key: string
): { allowed: true; remaining: number } | { allowed: false; resetInMs: number } {
  const r = rateLimiters[scope].tryConsumeWithRemaining(key)
  return r.allowed
    ? { allowed: true, remaining: r.remaining }
    : { allowed: false, resetInMs: r.resetInMs ?? 0 }
}
