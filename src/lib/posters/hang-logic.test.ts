import assert from 'node:assert/strict'
import { test } from 'node:test'

import { canHangPoster, hungIsStale, posterNudgeVisible, posterStartTarget, showcaseVisible } from './hang-logic.ts'

test('canHangPoster', () => {
  assert.equal(canHangPoster({ kind: 'upload', html: null, art_job_id: null, image_url: 'u' }), true)
  assert.equal(canHangPoster({ kind: 'upload', html: null, art_job_id: null, image_url: null }), false)
  assert.equal(canHangPoster({ kind: 'ai', html: '<div>', art_job_id: null, image_url: null }), true)
  assert.equal(canHangPoster({ kind: 'ai', html: null, art_job_id: null, image_url: null }), false)
  // 그림 그리는 중이면 그림 없는 PNG 가 걸린다
  assert.equal(canHangPoster({ kind: 'ai', html: '<div>', art_job_id: 'job', image_url: null }), false)
})

test('hungIsStale', () => {
  assert.equal(hungIsStale(null, '2026-11-07T00:00:00Z'), false)
  assert.equal(hungIsStale('2026-11-07T01:00:00Z', '2026-11-07T00:00:00Z'), false)
  assert.equal(hungIsStale('2026-11-07T00:00:00Z', '2026-11-07T01:00:00Z'), true)
})

test('showcaseVisible', () => {
  assert.equal(showcaseVisible({ visibility: 'public', poster_image_url: 'u' }), true)
  assert.equal(showcaseVisible({ visibility: 'private', poster_image_url: 'u' }), false)
  assert.equal(showcaseVisible({ visibility: 'public', poster_image_url: null }), false)
})

test('posterNudgeVisible', () => {
  const base = { isOwner: true, isPublic: true, hasHungPoster: false, otherNudgeShown: false }
  assert.equal(posterNudgeVisible(base), true)
  assert.equal(posterNudgeVisible({ ...base, isOwner: false }), false)
  assert.equal(posterNudgeVisible({ ...base, isPublic: false }), false)
  assert.equal(posterNudgeVisible({ ...base, hasHungPoster: true }), false)
  assert.equal(posterNudgeVisible({ ...base, otherNudgeShown: true }), false)
})

test('posterStartTarget', () => {
  assert.deepEqual(posterStartTarget([]), { kind: 'new' })
  assert.deepEqual(posterStartTarget(['a']), { kind: 'one', id: 'a' })
  assert.deepEqual(posterStartTarget(['a', 'b']), { kind: 'choose' })
})
