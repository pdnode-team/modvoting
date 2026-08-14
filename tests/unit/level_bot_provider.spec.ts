import { test } from '@japa/runner'
import { LevelBotProvider } from '#services/directory/level_bot_provider'
import type { DirectoryUser } from '#services/directory/types'

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const body = handler(url, init)
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as Response
  }
}

test.group('LevelBotProvider', () => {
  const BASE = 'http://level-bot.test'
  const KEY = 'test-key'

  test('fetchByZulipId: 按 Zulip ID 查询并映射字段', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch((url, init) => {
        assert.equal(url, `${BASE}/user?user_id=8`)
        assert.equal((init?.headers as Record<string, string>)['X-API-Key'], KEY)
        return {
          user_id: 8,
          name: 'Pidan',
          email: 'user8@chat.pdnode.com',
          total_xp: 136207,
          level: 123,
          rank: 'Legend 63',
        }
      }),
    })

    const user: DirectoryUser | null = await provider.fetchByZulipId(8)
    assert.deepEqual(user, {
      zulipId: 8,
      name: 'Pidan',
      email: 'user8@chat.pdnode.com',
      totalXp: 136207,
      level: 123,
      rank: 'Legend 63',
    })
  })

  test('fetchByName: 按名字查询', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch((url) => {
        assert.equal(url, `${BASE}/user?name=Pidan`)
        return { user_id: 8, name: 'Pidan', email: null, total_xp: 100, level: 11, rank: 'Silver I' }
      }),
    })

    const user = await provider.fetchByName('Pidan')
    assert.equal(user?.zulipId, 8)
    assert.equal(user?.level, 11)
  })

  test('fetchLeaderboard: 返回数组并映射字段', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch((url) => {
        assert.equal(url, `${BASE}/leaderboard?limit=5`)
        return [
          {
            rank: 1,
            user_id: 8,
            name: 'Pidan',
            total_xp: 136207,
            level: 123,
            rank_display: 'Legend 63',
          },
          {
            rank: 2,
            user_id: 16,
            name: '小狗 2.0',
            total_xp: 98339,
            level: 99,
            rank_display: 'Legend 39',
          },
        ]
      }),
    })

    const users = await provider.fetchLeaderboard(5)
    assert.lengthOf(users, 2)
    assert.equal(users[1].name, '小狗 2.0')
    assert.equal(users[1].zulipId, 16)
  })

  test('fetchByEmail: 按邮箱查询（Level Bot /user?email=）', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch((url, init) => {
        assert.equal(url, `${BASE}/user?email=user8%40chat.pdnode.com`)
        assert.equal((init?.headers as Record<string, string>)['X-API-Key'], KEY)
        return {
          user_id: 8,
          name: 'Pidan',
          email: 'user8@chat.pdnode.com',
          total_xp: 136207,
          level: 123,
          rank: 'Legend 63',
        }
      }),
    })

    const user = await provider.fetchByEmail('user8@chat.pdnode.com')
    assert.equal(user?.zulipId, 8)
    assert.equal(user?.email, 'user8@chat.pdnode.com')
  })

  test('fetchByEmail: 用户不存在 → null', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch(() => ({ error: 'user not found' })),
    })

    assert.isNull(await provider.fetchByEmail('nobody@chat.pdnode.com'))
  })

  test('fetchByZulipId: 走 /user 端点并带出 email', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch((url) => {
        assert.equal(url, `${BASE}/user?user_id=8`)
        return {
          user_id: 8,
          name: 'Pidan',
          email: 'user8@chat.pdnode.com',
          total_xp: 100,
          level: 11,
          rank: 'Silver I',
        }
      }),
    })

    const user = await provider.fetchByZulipId(8)
    assert.equal(user?.email, 'user8@chat.pdnode.com')
    assert.equal(user?.zulipId, 8)
  })

  test('fetchByName: 走 /user 端点', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch((url) => {
        assert.equal(url, `${BASE}/user?name=Pidan`)
        return { user_id: 8, name: 'Pidan', email: null, total_xp: 100, level: 11, rank: 'x' }
      }),
    })

    const user = await provider.fetchByName('Pidan')
    assert.equal(user?.zulipId, 8)
  })

  test('错误响应（用户不存在）→ 返回 null', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: mockFetch(() => ({ error: 'user not found' })),
    })

    const user = await provider.fetchByZulipId(999)
    assert.isNull(user)
  })

  test('非 2xx 响应 → 抛错', async ({ assert }) => {
    const provider = new LevelBotProvider(BASE, KEY, {
      fetchFn: async () => ({ ok: false, status: 401 }) as Response,
    })

    await assert.rejects(() => provider.fetchByZulipId(8), /Level Bot/)
  })
})
