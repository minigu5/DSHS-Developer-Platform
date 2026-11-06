import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashToken, judgeResult, judgeStuck, parseBearer, shouldApplyResult, sniffImageType } from './art-jobs-logic.ts'

test('hashToken = SHA-256 hex', async () =>
  assert.equal(await hashToken('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'))

test('parseBearer', () => {
  assert.equal(parseBearer('Bearer tok_1'), 'tok_1')
  assert.equal(parseBearer('Basic x'), null)
  assert.equal(parseBearer(null), null)
})

test('sniffImageType', () => {
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg')
  assert.equal(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp')
  assert.equal(sniffImageType(new TextEncoder().encode('<html><script>')), null)
})

const now = new Date('2026-11-06T12:00:00Z')
const working = { status: 'working' as const, worker_id: 'w1', job_secret_hash: 'h', lease_until: '2026-11-06T12:01:00Z' }

test('judgeResult', () => {
  assert.equal(judgeResult({ job: working, workerId: 'w1', secretHash: 'h', now }), 'accept')
  assert.equal(judgeResult({ job: working, workerId: null, secretHash: 'h', now }), 'reject') // 토큰 끊김
  assert.equal(judgeResult({ job: working, workerId: 'w2', secretHash: 'h', now }), 'reject')
  assert.equal(judgeResult({ job: working, workerId: 'w1', secretHash: 'x', now }), 'reject')
  assert.equal(judgeResult({ job: { ...working, lease_until: '2026-11-06T11:59:20Z' }, workerId: 'w1', secretHash: 'h', now }), 'reject') // 유예 30초 넘음
  assert.equal(judgeResult({ job: { ...working, lease_until: '2026-11-06T11:59:40Z' }, workerId: 'w1', secretHash: 'h', now }), 'accept') // 유예 안
  assert.equal(judgeResult({ job: { ...working, status: 'done' }, workerId: 'w1', secretHash: 'h', now }), 'already')
  assert.equal(judgeResult({ job: { ...working, status: 'canceled' }, workerId: 'w1', secretHash: 'h', now }), 'reject')
  assert.equal(judgeResult({ job: null, workerId: 'w1', secretHash: 'h', now }), 'reject')
})

const q = (ago: number) => ({ status: 'queued' as const, created_at: new Date(now.getTime() - ago).toISOString(), lease_until: null, claimed_at: null })

test('judgeStuck', () => {
  assert.deepEqual(judgeStuck({ job: q(61_000), macsAlive: false, now }), { stuck: true, release: true })
  assert.deepEqual(judgeStuck({ job: q(61_000), macsAlive: true, now }), { stuck: false })
  assert.deepEqual(judgeStuck({ job: q(301_000), macsAlive: true, now }), { stuck: true, release: true })
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'working', lease_until: '2026-11-06T11:59:29Z' }, macsAlive: false, now }), { stuck: true, release: true })
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'working', lease_until: '2026-11-06T11:59:31Z' }, macsAlive: false, now }), { stuck: false })
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'failed' }, macsAlive: true, now }), { stuck: true, release: false }) // fail 에서 이미 돌려줌
  assert.deepEqual(judgeStuck({ job: { ...q(0), status: 'expired' }, macsAlive: true, now }), { stuck: true, release: true })
})

test('shouldApplyResult', () => {
  assert.equal(shouldApplyResult('j1', 'j1'), true)
  assert.equal(shouldApplyResult('j2', 'j1'), false)
  assert.equal(shouldApplyResult(null, 'j1'), false)
})
