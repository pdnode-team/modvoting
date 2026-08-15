/**
 * 进程内滑动窗口限速器（Sliding Window Log）。
 *
 * - 用时间戳数组记录每次消费时刻
 * - tryConsume 时清理窗口外的过期记录，剩余数 + 1 vs limit
 * - 单进程内并发安全（Array.push 原子；同步操作）
 *
 * 适用场景：单实例部署、或暂时不引入 Redis 的开发/小型生产。
 * 多实例请用 RedisRateLimiter（未来实现）或上专业库。
 */

export interface RateLimitOptions {
  /** 窗口内允许的最大次数 */
  limit: number
  /** 窗口长度（毫秒） */
  windowMs: number
  /** 当前时间注入点（测试用） */
  now?: () => number
}

export interface RateLimitResult {
  allowed: boolean
  /** 当前窗口剩余配额（0 表示已满） */
  remaining: number
  /** 窗口重置还需等待毫秒数（仅 denied 时有意义） */
  resetInMs?: number
}

export class InMemoryRateLimiter {
  readonly #limit: number
  readonly #windowMs: number
  readonly #now: () => number
  readonly #store = new Map<string, number[]>()

  constructor(options: RateLimitOptions) {
    if (options.limit < 1) throw new Error('limit must be >= 1')
    if (options.windowMs < 1) throw new Error('windowMs must be >= 1')
    this.#limit = options.limit
    this.#windowMs = options.windowMs
    this.#now = options.now ?? Date.now
  }

  tryConsume(key: string): boolean {
    return this.tryConsumeWithRemaining(key).allowed
  }

  tryConsumeWithRemaining(key: string): RateLimitResult {
    const now = this.#now()
    const cutoff = now - this.#windowMs
    const stamps = (this.#store.get(key) ?? []).filter((t) => t > cutoff)

    if (stamps.length >= this.#limit) {
      // 重置时间 = 最早一条记录 + windowMs
      const resetInMs = stamps[0] + this.#windowMs - now
      this.#store.set(key, stamps)
      return { allowed: false, remaining: 0, resetInMs }
    }

    stamps.push(now)
    this.#store.set(key, stamps)
    return { allowed: true, remaining: this.#limit - stamps.length }
  }

  /** 重置 key（测试 + admin 用） */
  reset(key: string): void {
    this.#store.delete(key)
  }
}
