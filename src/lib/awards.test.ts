import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awardTone, awardsOf, cleanLabel } from './awards.ts'

test('숫자 등위는 금·은·동', () => {
  assert.equal(awardTone('1위'), 'gold')
  assert.equal(awardTone('2위'), 'silver')
  assert.equal(awardTone('3위'), 'bronze')
  assert.equal(awardTone('4위'), 'plain')
  assert.equal(awardTone('공동 1위'), 'gold')
  assert.equal(awardTone('11위'), 'plain')
})

test('상 이름도 맞춘다', () => {
  assert.equal(awardTone('대상'), 'gold')
  assert.equal(awardTone('은상'), 'silver')
  assert.equal(awardTone('동상'), 'bronze')
  assert.equal(awardTone('특별상'), 'plain')
})

test('높은 등위 먼저, events 객체·배열 모두 받고 빈 값은 버린다', () => {
  const r = awardsOf([
    { rank_label: '3위', created_at: '2026-01-01', events: { name: 'A' } },
    { rank_label: '1위', created_at: '2026-02-01', events: [{ name: 'B' }] },
    { rank_label: '2위', events: null },
  ])
  assert.deepEqual(r.map((a) => `${a.eventName}:${a.rankLabel}`), ['B:1위', 'A:3위'])
  assert.deepEqual(awardsOf(null), [])
})

test('cleanLabel 은 공백을 다듬는다', () => {
  assert.equal(cleanLabel('  공동   1위 '), '공동 1위')
})
