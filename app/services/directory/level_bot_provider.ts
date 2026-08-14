import type { DirectoryUser, UserDirectoryProvider } from './types.js'

interface LevelBotResponse {
  user_id: number
  name: string
  email: string | null
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
 * 端点（实测 2026-08-14）：
 *   GET /health              → { ok, service }
 *   GET /user?user_id=<id>   → { user_id, name, email, total_xp, level, rank }
 *   GET /user?email=<email>  → 同上（按邮箱）
 *   GET /user?name=<name>    → 同上（按名字）
 *   GET /leaderboard?limit=N → [{rank, user_id, name, total_xp, level, rank_display}, ...]
 * 认证：X-API-Key header。
 * 用户不存在：{ "error": "user not found" } → 返回 null。
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
    return this.#fetch('/user', { user_id: String(id) })
  }

  async fetchByName(name: string): Promise<DirectoryUser | null> {
    return this.#fetch('/user', { name })
  }

  async fetchByEmail(email: string): Promise<DirectoryUser | null> {
    return this.#fetch('/user', { email })
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

    const body = (typeof res.json === 'function' ? await res.json().catch(() => null) : null) as
      (LevelBotResponse & { error?: string }) | { error: string } | null

    if (!res.ok) {
      // Level Bot：用户不存在 → HTTP 404 + {"error":"user not found"} → null（不是异常）
      if (res.status === 404) {
        return null
      }
      throw new Error(`Level Bot ${path} failed: HTTP ${res.status}`)
    }

    if (!body || 'error' in body || typeof body.user_id !== 'number') {
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
      email: r.email ?? null,
      totalXp: r.total_xp,
      level: r.level,
      rank: r.rank,
    }
  }
}
