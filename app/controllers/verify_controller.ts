import { randomBytes } from 'node:crypto'
import User from '#models/user'
import { VerifyTokenService } from '#services/verify_token_service'
import { mailService } from '#services/mail_service'
import { directory } from '#services/directory/index'
import { verifyRequestValidator } from '#validators/verify'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * 免登录邮箱验证：输入邮箱 → 发一次性链接（16h）→ 点击即登录。
 * 邮箱必须存在于 Level Bot 用户列表（/user?email=），验证成功后绑定 Zulip 身份。
 */
export default class VerifyController {
  async show({ inertia }: HttpContext) {
    return inertia.render('verify/request', {})
  }

  async request({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(verifyRequestValidator)

    let userExists = false
    try {
      userExists = (await directory.fetchByEmail(email)) !== null
    } catch {
      session.flash('error', '用户目录暂时不可用，请稍后再试')
      return response.redirect().back()
    }
    if (!userExists) {
      session.flash('error', '该邮箱不在 Pdnode 用户列表中')
      return response.redirect().back()
    }

    const service = new VerifyTokenService()
    const { token } = await service.create(email)

    try {
      await mailService.sendVerifyLink(email, token)
      session.flash('success', '验证链接已发送，请查收邮件')
    } catch (error) {
      session.flash('error', error instanceof Error ? error.message : '邮件发送失败')
    }

    return response.redirect().back()
  }

  async confirm({ request, response, session, auth }: HttpContext) {
    const token = request.input('token')
    const service = new VerifyTokenService()

    let email: string
    try {
      email = await service.consume(token)
    } catch {
      session.flash('error', '链接无效或已过期，请重新获取')
      return response.redirect().toRoute('verify.show')
    }

    let directoryUser: Awaited<ReturnType<typeof directory.fetchByEmail>> = null
    try {
      directoryUser = await directory.fetchByEmail(email)
    } catch {
      session.flash('error', '用户目录暂时不可用，请稍后再试')
      return response.redirect().toRoute('verify.show')
    }
    if (!directoryUser) {
      session.flash('error', '该邮箱不在 Pdnode 用户列表中')
      return response.redirect().toRoute('verify.show')
    }

    let user = await User.findBy('email', email)
    if (!user) {
      user = await User.create({
        email,
        password: randomBytes(32).toString('hex'),
        fullName: directoryUser.name,
        zulipUserId: directoryUser.zulipId,
      })
    } else {
      user.fullName = directoryUser.name
      user.zulipUserId = directoryUser.zulipId
      await user.save()
    }

    await auth.use('web').login(user)
    session.flash('success', '邮箱验证成功')
    return response.redirect().toRoute('home')
  }
}
