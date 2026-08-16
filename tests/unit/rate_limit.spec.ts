import { test } from '@japa/runner'
import { checkLimit } from '#services/rate_limit'

test.group('checkLimit (rate_limit service)', () => {
  test('不同 scope 之间使用唯一 key 避免污染', ({ assert }) => {
    const r1 = checkLimit('verify', 'test:1:verify')
    const r2 = checkLimit('vote', 'test:1:vote')
    assert.isTrue(r1.allowed)
    assert.isTrue(r2.allowed)
  })

  test('allowed 返回 remaining', ({ assert }) => {
    const r = checkLimit('verify', 'fresh-unique-user-aaa')
    assert.isTrue(r.allowed)
    if (r.allowed) {
      assert.equal(r.remaining, 4) // verify limit = 5
    }
  })

  test('超限返回 denied + resetInMs', ({ assert }) => {
    const key = 'campaign-test-bbb-' + Date.now()
    for (let i = 0; i < 3; i++) checkLimit('campaign', key)
    const r = checkLimit('campaign', key)

    assert.isFalse(r.allowed)
    if (!r.allowed) {
      assert.isAbove(r.resetInMs, 0)
      assert.isAtMost(r.resetInMs, 60 * 60 * 1000)
    }
  })

  test('同一 scope 不同 key 独立计数', ({ assert }) => {
    const keyA = 'campaign-test-ccc-' + Date.now()
    const keyB = 'campaign-test-ddd-' + Date.now()
    for (let i = 0; i < 3; i++) checkLimit('campaign', keyA)

    const rA = checkLimit('campaign', keyA)
    const rB = checkLimit('campaign', keyB)

    assert.isFalse(rA.allowed)
    assert.isTrue(rB.allowed)
  })
})
