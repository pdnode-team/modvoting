import { randomBytes, randomInt } from 'node:crypto'

export interface TallyRow {
  candidateId: number
  votes: number
}

export interface TieBreakRecord {
  pool: number[]
  chosen: number[]
  seed: string
}

/**
 * 从平票池中随机挑选 k 个（crypto 真随机 + 审计 seed）。
 * 返回 { pool, chosen, seed } 供 tie_breaks 表持久化审计。
 */
export function randomPick<T>(items: T[], k: number, seed = randomBytes(16).toString('hex')): {
  picked: T[]
  seed: string
} {
  const arr = [...items]
  // Fisher-Yates with crypto random
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return { picked: arr.slice(0, k), seed }
}

/**
 * 选择票数前 n 名；第 n 名位置平票时在平票池中随机补位。
 * 返回选中 candidateId 列表；若发生平票随机，附带 TieBreakRecord。
 */
export function selectTop(
  tally: TallyRow[],
  n: number
): { selected: number[]; tieBreak: TieBreakRecord | null } {
  const sorted = [...tally].sort((a, b) => b.votes - a.votes)

  // 人数不足 n → 全部入选（无平票随机）
  if (sorted.length <= n) {
    return { selected: sorted.map((s) => s.candidateId), tieBreak: null }
  }

  const cutoff = sorted[n - 1].votes
  const locked = sorted.filter((s) => s.votes > cutoff).map((s) => s.candidateId)
  const tied = sorted.filter((s) => s.votes === cutoff)

  const need = n - locked.length

  // 平票池全部需要（如 4 人进 Top5）→ 无随机
  if (need >= tied.length) {
    return {
      selected: [...locked, ...tied.map((t) => t.candidateId)],
      tieBreak: null,
    }
  }

  const pool = tied.map((t) => t.candidateId)
  const { picked, seed } = randomPick(pool, need)
  return {
    selected: [...locked, ...picked],
    tieBreak: { pool, chosen: picked, seed },
  }
}
