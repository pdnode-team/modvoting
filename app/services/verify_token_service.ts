import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import EmailVerification from '#models/email_verification'

export class InvalidTokenError extends Error {}
export class ExpiredTokenError extends Error {}

export const VERIFY_TOKEN_TTL_HOURS = 16

/**
 * 邮箱免登录验证：一次性链接 token。
 *
 * - create: 生成 crypto 随机 token，16h 过期
 * - consume: 校验并一次性消费（used_at 置位，防重放）
 */
export class VerifyTokenService {
  async create(email: string): Promise<{ token: string; expiresAt: DateTime }> {
    const token = randomBytes(32).toString('hex')
    const expiresAt = DateTime.now().plus({ hours: VERIFY_TOKEN_TTL_HOURS })
    await EmailVerification.create({ email, token, expiresAt })
    return { token, expiresAt }
  }

  async consume(token: string): Promise<string> {
    const row = await EmailVerification.findBy('token', token)
    if (!row) {
      throw new InvalidTokenError('Invalid verification token')
    }
    if (row.usedAt) {
      throw new InvalidTokenError('Verification token already used')
    }
    if (row.expiresAt < DateTime.now()) {
      throw new ExpiredTokenError('Verification token expired')
    }

    row.usedAt = DateTime.now()
    await row.save()
    return row.email
  }
}
