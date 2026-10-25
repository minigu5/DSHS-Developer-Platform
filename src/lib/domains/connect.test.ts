import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRecords, runConnect } from './connect.ts'
import type { DnsClient } from './cloudflare.ts'

function fakeDns() {
  const removed: string[][] = []
  const dns: DnsClient = {
    create: async (rows) => rows.map((_, i) => `rec${i}`),
    remove: async (ids) => {
      removed.push(ids)
    },
    listManaged: async () => [],
  }
  return { dns, removed }
}

test('CNAME 하나 + TXT 들을 레코드로', () => {
  assert.deepEqual(buildRecords('meal', 'abc.vercel-dns-017.com', [{ name: '_vercel.dshs.dev', value: 'v' }]), [
    { type: 'CNAME', name: 'meal.dshs.dev', content: 'abc.vercel-dns-017.com' },
    { type: 'TXT', name: '_vercel.dshs.dev', content: 'v' },
  ])
})

test('DB 기록이 실패하면 방금 만든 레코드를 지우고 오류를 그대로 던진다', async () => {
  const { dns, removed } = fakeDns()
  const boom = new Error('not_owner')
  await assert.rejects(
    runConnect({ dns, rpcConnect: async () => { throw boom } }, buildRecords('meal', 'a.netlify.app', []), 'row'),
    (e) => e === boom,
  )
  assert.deepEqual(removed, [['rec0']])
})

test('성공하면 아무것도 지우지 않고 DB 에 레코드 id 를 넘긴다', async () => {
  const { dns, removed } = fakeDns()
  let got: string[] = []
  await runConnect({ dns, rpcConnect: async (ids) => { got = ids } }, buildRecords('meal', 'a.netlify.app', [{ name: '_x.meal.dshs.dev', value: 'y' }]), 'row')
  assert.deepEqual(got, ['rec0', 'rec1'])
  assert.deepEqual(removed, [])
})
