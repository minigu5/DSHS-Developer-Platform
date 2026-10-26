import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decide, managedRowId, placeholderWorks, redirectWorks, strayIds } from './check.ts'

const NOW = new Date('2026-11-01T18:30:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()
const row = (over: Partial<Parameters<typeof decide>[0]> = {}) => ({
  status: 'active' as const,
  created_at: daysAgo(30),
  broken_since: null as string | null,
  connected_at: null as string | null,
  ever_active: true,
  ...over,
})

test('확인되면 반납하지 않는다', () => {
  assert.deepEqual(decide(row({ status: 'broken', broken_since: daysAgo(10) }), { kind: 'ok' }, NOW), { ok: true, release: null })
})

test('8일째 끊겨 있으면 broken_7d', () => {
  assert.deepEqual(decide(row({ status: 'broken', broken_since: daysAgo(8) }), { kind: 'no_token' }, NOW), { ok: false, release: 'broken_7d' })
})

test('처음 끊긴 날은 반납하지 않는다', () => {
  assert.deepEqual(decide(row(), { kind: 'unreachable', detail: 'x' }, NOW), { ok: false, release: null })
})

test('2일 끊긴 오래된 주소는 반납하지 않는다', () => {
  assert.deepEqual(decide(row({ status: 'broken', broken_since: daysAgo(2) }), { kind: 'not_found_page' }, NOW), { ok: false, release: null })
})

test('한 번도 연결 안 된 채 8일 지난 주소는 never_connected_7d', () => {
  assert.deepEqual(decide(row({ status: 'pending', ever_active: false, created_at: daysAgo(8) }), { kind: 'unreachable', detail: 'x' }, NOW), {
    ok: false,
    release: 'never_connected_7d',
  })
})

test('예약만 하고 8일 지난 주소(확인 안 함)도 never_connected_7d', () => {
  assert.deepEqual(decide(row({ status: 'reserved', ever_active: false, created_at: daysAgo(8) }), null, NOW), {
    ok: false,
    release: 'never_connected_7d',
  })
})

test('연결 안 된 주소의 7일은 마지막 연결 시각부터 센다(6일째 확인·7일째 연결 → 바로 반납 안 함)', () => {
  assert.deepEqual(
    decide(row({ status: 'pending', ever_active: false, created_at: daysAgo(8), connected_at: daysAgo(1) }), { kind: 'unreachable', detail: 'x' }, NOW),
    { ok: false, release: null },
  )
  assert.deepEqual(
    decide(row({ status: 'pending', ever_active: false, created_at: daysAgo(20), connected_at: daysAgo(8) }), { kind: 'no_token' }, NOW),
    { ok: false, release: 'never_connected_7d' },
  )
})

test('예약 3일째는 그대로', () => {
  assert.deepEqual(decide(row({ status: 'reserved', ever_active: false, created_at: daysAgo(3) }), null, NOW), { ok: false, release: null })
})

test('레코드 comment 에서 행 id 를 꺼낸다', () => {
  assert.equal(managedRowId('dshs-subdomain:3f1c'), '3f1c')
  assert.equal(managedRowId('someone else'), null)
})

test('redirectWorks: 302 로 보낼 곳 https 주소로 보내야 바로가기 규칙이 동작하는 것', () => {
  const page = (status: number, location: string | null) => ({ status, headers: new Headers(), body: '', location })
  assert.equal(redirectWorks(page(302, 'https://a.acct.workers.dev/'), 'a.acct.workers.dev'), true)
  assert.equal(redirectWorks(page(301, 'https://a.acct.workers.dev/'), 'a.acct.workers.dev'), false)
  assert.equal(redirectWorks(page(302, 'https://a.acct.workers.dev.evil.com/'), 'a.acct.workers.dev'), false)
  assert.equal(redirectWorks(page(302, null), 'a.acct.workers.dev'), false)
  assert.equal(redirectWorks(page(200, null), 'a.acct.workers.dev'), false)
})

test('strayIds: 죽은 행의 것, 그리고 살아 있는 행인데 기록에 없고 1시간 넘은 것만 지운다', () => {
  const live = [
    { id: 'row-a', cf_record_ids: ['rec1', 'redirect:it1'] },
    { id: 'row-b', cf_record_ids: [] },
  ]
  const old = daysAgo(1)
  const fresh = new Date(NOW.getTime() - 5 * 60_000).toISOString()
  const dnsRecords = [
    { id: 'rec1', comment: 'dshs-subdomain:row-a', createdOn: old },   // 기록됨 → 둠
    { id: 'rec9', comment: 'dshs-subdomain:row-a', createdOn: old },   // 살아 있는 행의 찌꺼기 → 지움
    { id: 'rec8', comment: 'dshs-subdomain:row-b', createdOn: fresh }, // 막 만드는 중일 수 있음 → 둠
    { id: 'rec7', comment: 'dshs-subdomain:row-dead', createdOn: fresh }, // 죽은 행 → 지움
    { id: 'rec6', comment: 'dshs-subdomain:', createdOn: old },       // 행 id 없음 → 지움
  ]
  assert.deepEqual(strayIds(live, dnsRecords, (id) => id, NOW), ['rec9', 'rec7', 'rec6'])
  const items = [
    { id: 'it1', comment: 'dshs-subdomain:row-a', createdOn: old },
    { id: 'it2', comment: 'dshs-subdomain:row-a', createdOn: old },
  ]
  assert.deepEqual(strayIds(live, items, (id) => `redirect:${id}`, NOW), ['it2'])
})

test('placeholderWorks: 302 로 경고 페이지에 보내야 자리표시가 동작하는 것', () => {
  const page = (status: number, location: string | null) => ({ status, headers: new Headers(), body: '', location })
  assert.equal(placeholderWorks(page(302, 'https://dshs.dev/pending-domain/meal'), 'meal'), true)
  assert.equal(placeholderWorks(page(302, 'https://dshs.dev/pending-domain/other'), 'meal'), false)
  assert.equal(placeholderWorks(page(200, null), 'meal'), false)
})
