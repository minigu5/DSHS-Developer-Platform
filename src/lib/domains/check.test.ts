import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decide, managedRowId } from './check.ts'

const NOW = new Date('2026-11-01T18:30:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()
const row = (over: Partial<Parameters<typeof decide>[0]> = {}) => ({
  status: 'active' as const,
  created_at: daysAgo(30),
  broken_since: null as string | null,
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

test('예약 3일째는 그대로', () => {
  assert.deepEqual(decide(row({ status: 'reserved', ever_active: false, created_at: daysAgo(3) }), null, NOW), { ok: false, release: null })
})

test('레코드 comment 에서 행 id 를 꺼낸다', () => {
  assert.equal(managedRowId('dshs-subdomain:3f1c'), '3f1c')
  assert.equal(managedRowId('someone else'), null)
})
