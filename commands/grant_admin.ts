import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'

export default class GrantAdmin extends BaseCommand {
  static commandName = 'grant:admin'
  static description = '按邮箱授予用户管理员权限（admin.manage_objections，异议管理）'

  static options: CommandOptions = {}

  @args.string({ description: '用户邮箱（需已通过邮箱验证注册）' })
  declare email: string

  async run() {
    // ace 命令默认不完整启动应用（isBooted=false，db service 未初始化）
    if (!app.isBooted) {
      await app.boot()
    }

    const user = await db.from('users').where('email', this.email).first()
    if (!user) {
      this.logger.error(`用户不存在: ${this.email}（需先通过邮箱验证注册）`)
      this.exitCode = 1
      return
    }

    const permissions = JSON.parse(user.permissions || '[]') as string[]
    if (permissions.includes('admin.manage_objections')) {
      this.logger.info(`用户 ${this.email} 已是管理员`)
      return
    }

    permissions.push('admin.manage_objections')
    await db
      .from('users')
      .where('id', user.id)
      .update({
        permissions: JSON.stringify(permissions),
      })
    this.logger.success(`已授予管理员权限: ${this.email}`)
  }
}
