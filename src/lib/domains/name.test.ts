import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeName, validateName, RESERVED_NAMES } from './name.ts'

test('앞뒤 공백을 지우고 소문자로', () => {
  assert.equal(normalizeName(' Meal '), 'meal')
})

test('길이 3~30자', () => {
  assert.deepEqual(validateName('ab'), { ok: false, reason: 'length' })
  assert.deepEqual(validateName('a'.repeat(31)), { ok: false, reason: 'length' })
  assert.deepEqual(validateName('a'.repeat(30)), { ok: true })
})

test('영어 소문자·숫자·하이픈만, 하이픈으로 시작·끝 금지', () => {
  assert.deepEqual(validateName('meal_app'), { ok: false, reason: 'chars' })
  assert.deepEqual(validateName('-meal'), { ok: false, reason: 'chars' })
  assert.deepEqual(validateName('meal-'), { ok: false, reason: 'chars' })
  assert.deepEqual(validateName('Meal'), { ok: false, reason: 'chars' })
  assert.deepEqual(validateName('급식알리미'), { ok: false, reason: 'chars' })
  assert.deepEqual(validateName('meal-alarm'), { ok: true })
  assert.deepEqual(validateName('2048'), { ok: true })
})

test('예약어는 막는다', () => {
  assert.deepEqual(validateName('www'), { ok: false, reason: 'reserved' })
  assert.deepEqual(validateName('admin'), { ok: false, reason: 'reserved' })
  assert.ok(RESERVED_NAMES.includes('domains'))
})

test('xn-- 로 시작하는 이름(한글 등을 바꾼 punycode)은 따로 구분해 막는다', () => {
  assert.deepEqual(validateName('xn--abc'), { ok: false, reason: 'idn' })
  assert.deepEqual(validateName('xn--9d0bw1i8usvmp'), { ok: false, reason: 'idn' })
})
