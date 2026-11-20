import assert from 'node:assert/strict'
import { test } from 'node:test'

import { posterImageAt, posterSlotVisible, posterStartTarget, showcaseVisible } from './hang-logic.ts'

test('showcaseVisible', () => {
  assert.equal(showcaseVisible({ visibility: 'public', poster_image_url: 'u' }), true)
  assert.equal(showcaseVisible({ visibility: 'private', poster_image_url: 'u' }), false)
  assert.equal(showcaseVisible({ visibility: 'public', poster_image_url: null }), false)
})

test('posterSlotVisible', () => {
  const base = { isOwnerOrTeam: true, isPublic: true, hasHungPoster: false }
  assert.equal(posterSlotVisible(base), true)
  assert.equal(posterSlotVisible({ ...base, isOwnerOrTeam: false }), false)
  assert.equal(posterSlotVisible({ ...base, isPublic: false }), false)
  assert.equal(posterSlotVisible({ ...base, hasHungPoster: true }), false)
})

test('posterImageAt: Cloudinary 원본은 폭을 줄인 주소로, 바깥 주소는 그대로', () => {
  assert.equal(
    posterImageAt('https://res.cloudinary.com/c/image/upload/v1/dshs/posters/abc.png', 640),
    'https://res.cloudinary.com/c/image/upload/c_limit,w_640,f_auto,q_auto/v1/dshs/posters/abc.png',
  )
  assert.equal(posterImageAt('https://example.com/a.png', 640), 'https://example.com/a.png')
})

test('posterStartTarget', () => {
  assert.deepEqual(posterStartTarget([]), { kind: 'new' })
  assert.deepEqual(posterStartTarget(['a']), { kind: 'one', id: 'a' })
  assert.deepEqual(posterStartTarget(['a', 'b']), { kind: 'choose' })
})
