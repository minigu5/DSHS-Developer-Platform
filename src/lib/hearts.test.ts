import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heartCountOf } from './hearts.ts'

test('하트 수는 집계 결과에서, 없으면 0', () => {
  assert.equal(heartCountOf({ project_hearts: [{ count: 3 }] }), 3)
  assert.equal(heartCountOf({}), 0)
  assert.equal(heartCountOf({ project_hearts: [] }), 0)
  assert.equal(heartCountOf({ project_hearts: null }), 0)
})
