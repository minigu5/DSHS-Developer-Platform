import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatKst, versionRo } from './format.ts'

test('versionRo: 받침 없음·ㄹ 받침은 로, 그 밖은 으로', () => {
  assert.equal(versionRo(1), '버전 1로') // 일
  assert.equal(versionRo(2), '버전 2로') // 이
  assert.equal(versionRo(3), '버전 3으로') // 삼
  assert.equal(versionRo(4), '버전 4로') // 사
  assert.equal(versionRo(6), '버전 6으로') // 육
  assert.equal(versionRo(7), '버전 7로') // 칠
  assert.equal(versionRo(8), '버전 8로') // 팔
  assert.equal(versionRo(10), '버전 10으로') // 십
  assert.equal(versionRo(13), '버전 13으로') // 십삼
  assert.equal(versionRo(100), '버전 100으로') // 백
})

test('formatKst: 한국 시간 yyyy-MM-dd HH:mm', () => {
  assert.equal(formatKst('2026-10-24T04:05:00Z'), '2026-10-24 13:05')
  assert.equal(formatKst('2026-10-24T15:30:00Z'), '2026-10-25 00:30')
})
