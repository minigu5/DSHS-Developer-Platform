import assert from 'node:assert/strict'
import { test } from 'node:test'

import { canHangPoster, hangState, hungIsStale, posterImageAt, posterNudgeVisible, posterStartTarget, showcaseVisible } from './hang-logic.ts'

test('canHangPoster', () => {
  const none = { art_url: null, art_job_id: null, image_url: null }
  assert.equal(canHangPoster({ ...none, kind: 'upload', html: null, image_url: 'u' }), true)
  assert.equal(canHangPoster({ ...none, kind: 'upload', html: null }), false)
  assert.equal(canHangPoster({ ...none, kind: 'ai', html: '<div>' }), true)
  assert.equal(canHangPoster({ ...none, kind: 'ai', html: null }), false)
  // 그림 그리는 중이면 그림 없는 PNG 가 걸린다
  assert.equal(canHangPoster({ ...none, kind: 'ai', html: '<div>', art_job_id: 'job' }), false)
  // ART 자리가 있는데 그림도 일감도 없으면(그림 생성 실패) 빈 그림 자리로 걸린다
  const withSlot = '<div><img src="ART" alt=""></div>'
  assert.equal(canHangPoster({ ...none, kind: 'ai', html: withSlot }), false)
  assert.equal(canHangPoster({ ...none, kind: 'ai', html: withSlot, art_url: 'https://res.cloudinary.com/c/a.png' }), true)
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

test('posterImageAt: Cloudinary 원본은 폭을 줄인 주소로, 바깥 주소는 그대로', () => {
  assert.equal(
    posterImageAt('https://res.cloudinary.com/c/image/upload/v1/dshs/posters/abc.png', 640),
    'https://res.cloudinary.com/c/image/upload/c_limit,w_640,f_auto,q_auto/v1/dshs/posters/abc.png',
  )
  assert.equal(posterImageAt('https://example.com/a.png', 640), 'https://example.com/a.png')
})

test('hangState: AI 포스터 PNG 를 뒤에서 찍는 동안·실패·완료', () => {
  const now = Date.parse('2026-11-07T10:02:00Z')
  assert.equal(hangState({ imageUrl: 'u', hungAt: '2026-11-07T10:00:00Z' }, now), 'hung')
  assert.equal(hangState({ imageUrl: null, hungAt: '2026-11-07T10:01:30Z' }, now), 'rendering')
  // 2분이 지나도 그림이 없으면 찍기에 실패한 것(Workers 는 응답 뒤 30초까지만 기다린다)
  assert.equal(hangState({ imageUrl: null, hungAt: '2026-11-07T09:59:59Z' }, now), 'failed')
  assert.equal(hangState({ imageUrl: null, hungAt: null }, now), 'failed')
})

test('posterStartTarget', () => {
  assert.deepEqual(posterStartTarget([]), { kind: 'new' })
  assert.deepEqual(posterStartTarget(['a']), { kind: 'one', id: 'a' })
  assert.deepEqual(posterStartTarget(['a', 'b']), { kind: 'choose' })
})
