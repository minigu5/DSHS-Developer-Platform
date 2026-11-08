import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heartCountOf } from './hearts.ts'

test('하트 수는 heart_count 칸에서, 없으면 0', () => {
  assert.equal(heartCountOf({ heart_count: 3 }), 3)
  assert.equal(heartCountOf({}), 0)
  assert.equal(heartCountOf({ heart_count: null }), 0)
})
