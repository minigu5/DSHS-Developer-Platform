import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POSTER_AI_JOB } from './config.ts'
import { isFinished, isJobId, judgeAiJobStuck, signPosterJob, verifyPosterJob } from './ai-jobs-logic.ts'

const ID = '0b9c1f0e-8a1d-4c55-9a52-3f7f0f3a1b2c'

test('서명: 같은 키·id면 맞고, 다르면 틀림', async () => {
  const sig = await signPosterJob(ID, 'secret-1')
  assert.equal(sig.length, 64)
  assert.equal(await verifyPosterJob(ID, sig, 'secret-1'), true)
  assert.equal(await verifyPosterJob(ID, sig, 'secret-2'), false)
  assert.equal(await verifyPosterJob('0b9c1f0e-8a1d-4c55-9a52-3f7f0f3a1b2d', sig, 'secret-1'), false)
  assert.equal(await verifyPosterJob(ID, null, 'secret-1'), false)
  assert.equal(await verifyPosterJob(ID, sig, undefined), false)
  assert.equal(await verifyPosterJob(ID, sig.slice(1), 'secret-1'), false)
})

test('isJobId', () => {
  assert.equal(isJobId(ID), true)
  assert.equal(isJobId('x'), false)
  assert.equal(isJobId(1), false)
})

test('막힘: queued 는 queueMaxMs 넘으면', () => {
  const now = new Date('2026-11-07T10:00:00Z')
  const at = (ms: number) => new Date(now.getTime() - ms).toISOString()
  assert.equal(judgeAiJobStuck({ status: 'queued', created_at: at(60_000), started_at: null }, now), false)
  assert.equal(judgeAiJobStuck({ status: 'queued', created_at: at(POSTER_AI_JOB.queueMaxMs + 1), started_at: null }, now), true)
})

test('막힘: working 은 시작부터 workMaxMs 넘으면', () => {
  const now = new Date('2026-11-07T10:00:00Z')
  const at = (ms: number) => new Date(now.getTime() - ms).toISOString()
  // 줄에서 오래 기다렸어도 시작한 지 얼마 안 됐으면 막힘 아님
  assert.equal(judgeAiJobStuck({ status: 'working', created_at: at(POSTER_AI_JOB.workMaxMs * 2), started_at: at(10_000) }, now), false)
  assert.equal(judgeAiJobStuck({ status: 'working', created_at: at(POSTER_AI_JOB.workMaxMs + 5), started_at: at(POSTER_AI_JOB.workMaxMs + 1) }, now), true)
})

test('끝난 일감은 막힘 아님', () => {
  const now = new Date('2026-11-07T10:00:00Z')
  for (const status of ['done', 'failed', 'expired'] as const) {
    assert.equal(judgeAiJobStuck({ status, created_at: '2026-11-01T00:00:00Z', started_at: null }, now), false)
    assert.equal(isFinished(status), true)
  }
  assert.equal(isFinished('working'), false)
})
