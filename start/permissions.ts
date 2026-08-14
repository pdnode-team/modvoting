import { definePermissions } from '@adonisplus/permissions'

/**
 * 权限词汇表。等级（Silver/Titanium）是动态外部状态，由 Level Bot
 * 实时校验（见 level_guard_service），不在此定义。
 */
export const permissions = definePermissions({
  admin: {
    manage_objections: 'Review and resolve election objections',
  },
})

export type PermissionKey = ReturnType<typeof permissions.keys>[number]
