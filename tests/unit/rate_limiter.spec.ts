import { test } from '@japa/runner'
import { InMemoryRateLimiter } from '#services/rate_limiter'

test.group('RateLimiter (InMemory)', () => {
  test('首次请求：允许', ({ assert }) => {
    const limiter = new InMemoryRateLimiter({ limit: 3, windowMs: 60_000 })

    assert.isTrue(limiter.tryConsume('user:1'))
  })

  test('窗口内未超上限：允许', ({ assert }) => {
    const limiter = new InMemoryRateLimiter({ limit: 3, windowMs: 60_000 })

    assert.isTrue(limiter.tryConsume('key1'))
    assert.isTrue(limiter.tryConsume('key1'))
    assert.isTrue(limiter.tryConsume('key1'))
  })

  test('窗口内超上限：拒绝', ({ assert }) => {
    const limiter = new InMemoryRateLimiter({ limit: 3, windowMs: 60_000 })

    assert.isTrue(limiter.tryConsume('key1'))
    assert.isTrue(limiter.tryConsume('key1'))
    assert.isTrue(limiter.tryConsume('key1'))
    assert.isFalse(limiter.tryConsume('key1')) // 第 4 次拒绝
  })

  test('不同 key 独立计数', ({ assert }) => {
    const limiter = new InMemoryRateLimiter({ limit: 2, windowMs: 60_000 })

    assert.isTrue(limiter.tryConsume('user:A'))
    assert.isTrue(limiter.tryConsume('user:A'))
    assert.isFalse(limiter.tryConsume('user:A'))
    assert.isTrue(limiter.tryConsume('user:B'))
    assert.isTrue(limiter.tryConsume('user:B'))
  })

  test('窗口过期后重置计数', ({ assert }) => {
    let now = 1000
    const limiter = new InMemoryRateLimiter({
      limit: 2,
      windowMs: 100,
      now: () => now,
    })

    assert.isTrue(limiter.tryConsume('k'))
    assert.isTrue(limiter.tryConsume('k'))
    assert.isFalse(limiter.tryConsume('k'))

    now += 101 // 跨过窗口

    assert.isTrue(limiter.tryConsume('k')) // 窗口重置，重新允许
  })

  test('tryConsume 返回剩余配额（用于 UI 提示）', ({ assert }) => {
    const limiter = new InMemoryRateLimiter({ limit: 3, windowMs: 60_000 })

    const r1 = limiter.tryConsumeWithRemaining('k')
    assert.equal(r1.allowed, true)
    assert.equal(r1.remaining, 2)

    limiter.tryConsume('k')
    limiter.tryConsume('k')
    const r4 = limiter.tryConsumeWithRemaining('k')
    assert.equal(r4.allowed, false)
    assert.equal(r4.remaining, 0)
  })

  test('并发安全：同 key 同时多次请求不会超过限制', ({ assert }) => {
    const limiter = new InMemoryRateLimiter({ limit: 5, windowMs: 60_000 })

    // 模拟 10 个并发请求
    const results = Array.from({ length: 10 }, () => limiter.tryConsume('k'))
    const allowed = results.filter((r) => r).length

    assert.equal(allowed, 5) // 恰好 5 个通过
  })
})
