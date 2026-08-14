import { test } from '@japa/runner'
import { LevelGuardService, LevelInsufficientError } from '#services/level_guard_service'
import type { DirectoryUser, UserDirectoryProvider } from '#services/directory/types'

function fakeProvider(
  levels: Record<number, number | null>
): UserDirectoryProvider & { getCalls: () => number } {
  const state = { calls: 0 }
  return {
    async fetchByZulipId(id: number) {
      state.calls += 1
      const level = levels[id]
      if (level === undefined || level === null) return null
      return { zulipId: id, name: `u${id}`, totalXp: 0, level, rank: 'x' } as DirectoryUser
    },
    async fetchByName() {
      return null
    },
    async fetchLeaderboard() {
      return []
    },
    async fetchByEmail() {
      return null
    },
    getCalls() {
      return state.calls
    },
  }
}

test.group('LevelGuardService', () => {
  test('Silver 门槛：level 11 通过，10 拒绝', async ({ assert }) => {
    const provider = fakeProvider({ 1: 11, 2: 10 })
    const guard = new LevelGuardService(provider)

    await assert.doesNotReject(() => guard.assertLevel(1, 'silver'))
    await assert.rejects(() => guard.assertLevel(2, 'silver'), LevelInsufficientError)
  })

  test('Titanium 门槛：level 26 通过，25 拒绝', async ({ assert }) => {
    const provider = fakeProvider({ 1: 26, 2: 25 })
    const guard = new LevelGuardService(provider)

    await assert.doesNotReject(() => guard.assertLevel(1, 'titanium'))
    await assert.rejects(() => guard.assertLevel(2, 'titanium'), LevelInsufficientError)
  })

  test('目录中不存在（null）→ 拒绝', async ({ assert }) => {
    const provider = fakeProvider({ 1: null })
    const guard = new LevelGuardService(provider)

    await assert.rejects(() => guard.assertLevel(1, 'silver'), LevelInsufficientError)
  })

  test('5 分钟缓存：TTL 内重复校验不重新拉取', async ({ assert }) => {
    const provider = fakeProvider({ 1: 30 })
    const guard = new LevelGuardService(provider)

    await guard.assertLevel(1, 'titanium')
    await guard.assertLevel(1, 'titanium')
    await guard.assertLevel(1, 'silver')

    assert.equal(provider.getCalls(), 1)
  })

  test('缓存过期后重新拉取', async ({ assert }) => {
    const provider = fakeProvider({ 1: 30 })
    const guard = new LevelGuardService(provider, { cacheTtlMinutes: 1 })

    await guard.assertLevel(1, 'titanium')
    guard.clearCache()
    await guard.assertLevel(1, 'titanium')

    assert.equal(provider.getCalls(), 2)
  })
})
