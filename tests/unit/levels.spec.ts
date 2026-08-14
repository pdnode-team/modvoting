import { test } from '@japa/runner'
import { isSilverPlus, isTitaniumPlus, LEVELS } from '#services/levels'

test.group('level thresholds', () => {
  test('Silver 门槛 = L11（对应 XP 3162+）', ({ assert }) => {
    assert.equal(LEVELS.SILVER_MIN, 11)
    assert.isFalse(isSilverPlus(10))
    assert.isTrue(isSilverPlus(11))
    assert.isTrue(isSilverPlus(15))
  })

  test('Titanium 门槛 = L26（对应 XP 12500+）', ({ assert }) => {
    assert.equal(LEVELS.TITANIUM_MIN, 26)
    assert.isFalse(isTitaniumPlus(25))
    assert.isTrue(isTitaniumPlus(26))
    assert.isTrue(isTitaniumPlus(123))
  })

  test('Titanium 是 Silver 的子集（Titanium+ 必然 Silver+）', ({ assert }) => {
    assert.isTrue(isSilverPlus(26))
    assert.isTrue(isSilverPlus(60))
  })
})
