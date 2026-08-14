import { DateTime } from 'luxon'
import type { UserDirectoryProvider } from './directory/types.js'
import { isSilverPlus, isTitaniumPlus } from './levels.js'

export type RequiredLevel = 'silver' | 'titanium'

export class LevelInsufficientError extends Error {
  constructor(required: RequiredLevel, level: number | null) {
    super(`Requires ${required}+ level, current level: ${level ?? 'unknown'}`)
    this.name = 'LevelInsufficientError'
  }
}

interface CacheEntry {
  level: number | null
  fetchedAt: DateTime
}

/**
 * 等级守卫：动作发生时实时调用 Level Bot 校验等级（带 TTL 内存缓存）。
 * 等级是动态外部状态，不属于 RBAC 权限。
 */
export class LevelGuardService {
  readonly #provider: UserDirectoryProvider
  readonly #cacheTtlMinutes: number
  readonly #cache = new Map<number, CacheEntry>()

  constructor(provider: UserDirectoryProvider, options: { cacheTtlMinutes?: number } = {}) {
    this.#provider = provider
    this.#cacheTtlMinutes = options.cacheTtlMinutes ?? 5
  }

  async assertLevel(zulipId: number, required: RequiredLevel): Promise<number> {
    const level = await this.#fetchLevel(zulipId)
    const ok = required === 'silver' ? isSilverPlus(level ?? -1) : isTitaniumPlus(level ?? -1)
    if (!ok) {
      throw new LevelInsufficientError(required, level)
    }
    return level as number
  }

  clearCache(): void {
    this.#cache.clear()
  }

  async #fetchLevel(zulipId: number): Promise<number | null> {
    const cached = this.#cache.get(zulipId)
    if (cached && cached.fetchedAt.plus({ minutes: this.#cacheTtlMinutes }) > DateTime.now()) {
      return cached.level
    }

    const user = await this.#provider.fetchByZulipId(zulipId)
    const level = user?.level ?? null
    this.#cache.set(zulipId, { level, fetchedAt: DateTime.now() })
    return level
  }
}
