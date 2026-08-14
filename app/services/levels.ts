/**
 * 等级阈值（与 Pdnode 等级系统一致，来自官方等级表）：
 * - Silver（L11-L15）门槛 = L11，对应 Total_XP = 100 × (11-1)^1.5 ≈ 3,162
 * - Titanium（L26-L30）门槛 = L26，对应 Total_XP = 100 × (26-1)^1.5 = 12,500
 */
export const LEVELS = {
  SILVER_MIN: 11,
  TITANIUM_MIN: 26,
} as const

export function isSilverPlus(level: number): boolean {
  return level >= LEVELS.SILVER_MIN
}

export function isTitaniumPlus(level: number): boolean {
  return level >= LEVELS.TITANIUM_MIN
}
