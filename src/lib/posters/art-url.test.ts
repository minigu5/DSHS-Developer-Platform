import { test } from 'node:test'
import assert from 'node:assert/strict'
import { posterArtDisplayUrl, posterArtPrintUrl } from './art-url.ts'

const URL_ = 'https://res.cloudinary.com/demo/image/upload/v1/dshs/posters/a.jpg'

test('보여 줄 땐 흰 테두리를 잘라 내고 여백을 조금 다시 둔다', () => {
  assert.equal(posterArtDisplayUrl(URL_), 'https://res.cloudinary.com/demo/image/upload/e_trim:10/c_pad,w_1.1,h_1.1,b_white/v1/dshs/posters/a.jpg')
})

test('내보낼 땐 잘라 낸 뒤 줄였다가 4배 확대', () => {
  assert.equal(
    posterArtPrintUrl(URL_, { width: 1080, height: 600 }),
    'https://res.cloudinary.com/demo/image/upload/e_trim:10/c_pad,w_1.1,h_1.1,b_white/c_limit,w_657,h_365/e_upscale/q_auto:good/v1/dshs/posters/a.jpg',
  )
})

test('확대 입력은 늘 0.25MP 미만(10회로 세는 구간)', () => {
  for (const [width, height] of [[1080, 600], [600, 1400], [1, 1], [1240, 300]]) {
    const m = posterArtPrintUrl(URL_, { width, height })!.match(/w_(\d+),h_(\d+)/)!
    assert.ok(Number(m[1]) * Number(m[2]) < 250_000)
  }
  assert.match(posterArtPrintUrl(URL_, null)!, /c_limit,w_489,h_489\//)
})

test('Cloudinary 주소가 아니면 그대로(보여 주기)·null(내보내기)', () => {
  assert.equal(posterArtDisplayUrl('https://example.com/image/upload/a.jpg'), 'https://example.com/image/upload/a.jpg')
  assert.equal(posterArtPrintUrl('https://example.com/image/upload/a.jpg', null), null)
})
