import { test } from 'node:test'
import assert from 'node:assert/strict'
import { heartbeatJson, parseHeartbeatBody } from './heartbeat.ts'

test('공백 뒤 JSON을 읽는다', () => {
  assert.deepEqual(parseHeartbeatBody('   \n {"ok":true}'), { ok: true })
})

test('heartbeatJson: 작업 결과가 본문 끝에 JSON으로', async () => {
  const res = heartbeatJson(async () => ({ ok: 1 }), 5)
  assert.deepEqual(parseHeartbeatBody(await res.text()), { ok: 1 })
})

test('heartbeatJson: 작업이 throw하면 {ok:false}', async () => {
  const res = heartbeatJson(async () => {
    throw new Error('x')
  }, 5)
  assert.deepEqual(parseHeartbeatBody(await res.text()), { ok: false, error: '잠시 뒤 다시 시도해 주세요.' })
})
