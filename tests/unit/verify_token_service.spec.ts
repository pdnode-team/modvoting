import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import EmailVerification from '#models/email_verification'
import {
  VerifyTokenService,
  InvalidTokenError,
  ExpiredTokenError,
  VERIFY_TOKEN_TTL_HOURS,
} from '#services/verify_token_service'

test.group('VerifyTokenService', (group) => {
  group.each.setup(async () => {
    await db.rawQuery('DELETE FROM email_verifications')
  })

  const service = new VerifyTokenService()

  test('create: 生成 64 位 hex token，16h 过期，落库', async ({ assert }) => {
    const { token, expiresAt } = await service.create('alice@pdnode.com')

    assert.match(token, /^[0-9a-f]{64}$/)
    assert.equal(VERIFY_TOKEN_TTL_HOURS, 16)

    const row = await EmailVerification.findBy('token', token)
    assert.isNotNull(row)
    assert.equal(row!.email, 'alice@pdnode.com')
    const roundTripDiff = Math.abs(row!.expiresAt.diff(expiresAt, 'seconds').seconds)
    assert.isBelow(roundTripDiff, 1)

    const ttlHours = row!.expiresAt.diffNow('hours').hours
    assert.isAbove(ttlHours, 15.9)
    assert.isBelow(ttlHours, 16.1)
  })

  test('consume: 有效 token 返回邮箱并标记 used_at', async ({ assert }) => {
    const { token } = await service.create('alice@pdnode.com')

    const email = await service.consume(token)
    assert.equal(email, 'alice@pdnode.com')

    const row = await EmailVerification.findBy('token', token)
    assert.isNotNull(row!.usedAt)
  })

  test('consume: 二次使用 → InvalidTokenError（防重放）', async ({ assert }) => {
    const { token } = await service.create('alice@pdnode.com')
    await service.consume(token)

    await assert.rejects(() => service.consume(token), InvalidTokenError)
  })

  test('consume: 未知 token → InvalidTokenError', async ({ assert }) => {
    await assert.rejects(() => service.consume('0'.repeat(64)), InvalidTokenError)
  })

  test('consume: 过期 token → ExpiredTokenError', async ({ assert }) => {
    const { token } = await service.create('alice@pdnode.com')
    const row = await EmailVerification.findBy('token', token)!
    row!.expiresAt = DateTime.now().minus({ hours: 1 })
    await row!.save()

    await assert.rejects(() => service.consume(token), ExpiredTokenError)
  })
})
