import { test } from 'node:test'
import assert from 'node:assert/strict'
import { syncFavicon, type FaviconSyncDeps, type FaviconSyncRow } from './favicon-sync.ts'

const row: FaviconSyncRow = {
  id: 'p1',
  title: '데모',
  url: 'https://demo.example.com',
  icon_url: 'https://demo.example.com/old.png',
}
const GOOGLE = 'https://www.google.com/s2/favicons?sz=128&domain=demo.example.com'
const DDG = 'https://icons.duckduckgo.com/ip3/demo.example.com.ico'

const deps = (next: string | null, oldOk = true): FaviconSyncDeps => ({
  resolve: async () => next,
  check: async () => oldOk,
})

test('사이트 파비콘 주소가 바뀌었으면 갱신', async () => {
  assert.deepEqual(await syncFavicon(row, deps('https://demo.example.com/new.png')), {
    kind: 'updated',
    patch: { icon_url: 'https://demo.example.com/new.png' },
  })
})

test('같으면 그대로', async () => {
  assert.deepEqual(await syncFavicon(row, deps(row.icon_url)), { kind: 'unchanged' })
})

test('못 찾으면 지우지 않는다', async () => {
  const out = await syncFavicon(row, deps(null))
  assert.equal(out.kind, 'skipped')
})

test('사이트 주소가 없으면 건너뜀', async () => {
  const out = await syncFavicon({ ...row, url: null }, deps('https://x.example.com/a.png'))
  assert.equal(out.kind, 'skipped')
})

test('공개 서비스로 떨어졌는데 기존 직접 아이콘이 아직 열리면 유지', async () => {
  assert.equal((await syncFavicon(row, deps(GOOGLE, true))).kind, 'skipped')
  assert.equal((await syncFavicon(row, deps(DDG, true))).kind, 'skipped')
})

test('기존 직접 아이콘이 깨졌으면 공개 서비스 주소로라도 바꾼다', async () => {
  assert.deepEqual(await syncFavicon(row, deps(GOOGLE, false)), { kind: 'updated', patch: { icon_url: GOOGLE } })
})

test('아이콘이 없었거나 원래 공개 서비스였으면 공개 서비스끼리도 바꾼다', async () => {
  assert.equal((await syncFavicon({ ...row, icon_url: null }, deps(GOOGLE))).kind, 'updated')
  assert.equal((await syncFavicon({ ...row, icon_url: DDG }, deps(GOOGLE))).kind, 'updated')
})
