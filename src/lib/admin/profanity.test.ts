import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findProfanity, hasProfanity, highlightSegments } from './profanity.ts'

test('흔한 욕설과 끼워 쓴 변형을 찾는다', () => {
  for (const text of ['시발', '시 발', '씨.발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새끼', '좆', 'fuck', 'F*U*C*K']) {
    assert.equal(hasProfanity(text), true, text)
  }
})

test('평범한 글과 욕이 아닌 낱말은 그대로 둔다', () => {
  assert.equal(hasProfanity('안녕하세요 좋은 프로젝트네요'), false)
  assert.equal(hasProfanity('미시발달'), false)
  assert.equal(hasProfanity('시발점'), false)
})

test('원문 기준 위치를 돌려준다', () => {
  assert.deepEqual(findProfanity('와 시 발 진짜'), [{ word: '시발', start: 2, end: 5 }])
})

test('화면 표시용으로 걸린 구간을 나눈다', () => {
  assert.deepEqual(highlightSegments('a병신b'), [
    { text: 'a', hit: false },
    { text: '병신', hit: true },
    { text: 'b', hit: false },
  ])
})
