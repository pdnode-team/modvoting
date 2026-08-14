import type { DirectoryUser, UserDirectoryProvider } from './types.js'

interface LevelBotResponse {
  user_id: number
  name: string
  total_xp: number
  level: number
  rank: string
}

interface LevelBotProviderOptions {
  fetchFn?: typeof fetch
}

/**
 * Pdnode Level Bot（zulip-level-bot）实现。
 *
 * 端点：
 *   GET /health              → { ok, service }
 *   GET /xp?name=<name>      → { user_id, name, total_xp, level, rank }
 *   GET /xp?user_id=<id>     → 同上
 *   GET /leaderboard?limit=N → 数组（含 rank_display）
 * 认证：X-API-Key header。
 *
 * 当前不支持按邮箱查询（无 email 端点），fetchByEmail 返回 null。
 */
export class LevelBotProvider implements UserDirectoryProvider {
  readonly #baseUrl: string
  readonly #apiKey: string
  readonly #fetchFn: typeof fetch

  constructor(baseUrl: string, apiKey: string, options: LevelBotProviderOptions = {}) {
    this.#baseUrl = baseUrl.replace(/\/$/, '')
    this.#apiKey = apiKey
    this.#fetchFn = options.fetchFn ?? globalThis.fetch
  }

  async fetchByZulipId(id: number): Promise<DirectoryUser | null> {
    return this.#fetch('/xp', { user_id: String(id) })
  }

  async fetchByName(name: string): Promise<DirectoryUser | null> {
    return this.#fetch('/xp', { name })
  }

  async fetchByEmail(_email: string): Promise<DirectoryUser | null> {
    // Level Bot 无 email 端点；待用户补充后实现
    return null
  }

  async fetchLeaderboard(limit = 20): Promise<DirectoryUser[]> {
    const url = `${this.#baseUrl}/leaderboard?limit=${limit}`
    const res = await this.#fetchFn(url, this.#headers())

    if (!res.ok) {
      throw new Error(`Level Bot /leaderboard failed: HTTP ${res.status}`)
    }

    const rows = (await res.json()) as LevelBotResponse[]
    return rows.map((r) => this.#map(r))
  }

  async #fetch(path: string, params: Record<string, string>): Promise<DirectoryUser | null> {
    const qs = new URLSearchParams(params).toString()
    const url = `${this.#baseUrl}${path}?${qs}`
    const res = await this.#fetchFn(url, this.#headers())

    if (!res.ok) {
      throw new Error(`Level Bot ${path} failed: HTTP ${res.status}`)
    }

    const body = (await res.json()) as LevelBotResponse | { error: string }
    if ('error' in body || typeof body.user_id !== 'number') {
      return null
    }

    return this.#map(body)
  }

  #headers(): RequestInit {
    return {
      headers: { 'X-API-Key': this.#apiKey },
    }
  }

  #map(r: LevelBotResponse): DirectoryUser {
    return {
      zulipId: r.user_id,
      name: r.name,
      totalXp: r.total_xp,
      level: r.level,
      rank: r.rank,
    }
  }
}
