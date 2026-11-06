import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kstDate } from './kst.ts'

test('KST 날짜: UTC 15:00 이후는 다음 날', () => {
  assert.equal(kstDate(new Date('2026-11-06T14:59:00Z')), '2026-11-06')
  assert.equal(kstDate(new Date('2026-11-06T15:00:00Z')), '2026-11-07')
})
