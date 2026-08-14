/** 用户目录中的用户（来自 Level Bot / Zulip） */
export interface DirectoryUser {
  zulipId: number
  name: string
  totalXp: number
  level: number
  rank: string
}

/**
 * 用户目录抽象：Level Bot 为实现，Misskey 等后续扩展。
 * 邮箱查询为可选能力（Level Bot 当前未提供 email 端点，返回 null 表示不支持）。
 */
export interface UserDirectoryProvider {
  fetchByZulipId(id: number): Promise<DirectoryUser | null>
  fetchByName(name: string): Promise<DirectoryUser | null>
  fetchLeaderboard(limit?: number): Promise<DirectoryUser[]>
  fetchByEmail(email: string): Promise<DirectoryUser | null>
}
