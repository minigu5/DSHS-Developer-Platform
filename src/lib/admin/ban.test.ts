import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BAN_DURATIONS, banNotice, banUntil, friendlyWriteError, latestBanUntil, toBanView } from './ban.ts'

test('기간 선택지는 1일·7일·30일·무제한', () => {
  assert.deepEqual(BAN_DURATIONS.map((d) => d.value), ['1d', '7d', '30d', 'forever'])
})

test('끝나는 시각을 계산한다', () => {
  const now = new Date('2026-11-05T00:00:00Z')
  assert.equal(banUntil('7d', now)?.toISOString(), '2026-11-12T00:00:00.000Z')
  assert.equal(banUntil('forever', now), null)
})

test('안내 문구는 한국 시간으로', () => {
  assert.equal(banNotice(null), '관리자가 풀 때까지 글을 쓸 수 없어요.')
  assert.equal(banNotice('2026-11-12T03:00:00Z'), '11월 12일 12시까지 글을 쓸 수 없어요.')
  assert.equal(banNotice('2026-11-12T03:30:00Z'), '11월 12일 12시 30분까지 글을 쓸 수 없어요.')
})

test('DB 차단 오류만 안내 문구로 바꾼다', () => {
  assert.equal(friendlyWriteError('new row violates check: user_banned'), banNotice(null))
  assert.equal(friendlyWriteError('user_banned', '2026-11-12T03:00:00Z'), banNotice('2026-11-12T03:00:00Z'))
  assert.equal(friendlyWriteError('other'), null)
})

test('차단 목록을 화면으로 넘길 때 사용자 id 를 빼고, 익명 글에서 건 차단은 이름도 뺀다', () => {
  const row = { banId: 'b1', userId: 'u1', name: '민규', anonymous: true, until: null, reason: '도배', createdAt: '2026-11-05T00:00:00Z' }
  const view = toBanView(row)
  assert.equal('userId' in view, false)
  assert.equal(view.name, null)
  assert.deepEqual(toBanView({ ...row, anonymous: false }), { banId: 'b1', name: '민규', anonymous: false, until: null, reason: '도배', createdAt: '2026-11-05T00:00:00Z' })
})

test('여러 차단 중 가장 늦게 끝나는 것(무제한 우선)을 고른다 — 해시로 찾은 줄도 같이', () => {
  assert.equal(latestBanUntil([{ until: '2026-11-08T00:00:00Z' }, { until: '2026-11-12T00:00:00Z' }]), '2026-11-12T00:00:00Z')
  assert.equal(latestBanUntil([{ until: '2026-11-08T00:00:00Z' }, { until: null }]), null)
  assert.equal(latestBanUntil([]), undefined)
})
