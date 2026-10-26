import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { DnsClient } from './cloudflare.ts'
import type { RedirectClient } from './redirects.ts'
import { removeCloudflareWith, splitCloudflareIds } from './cleanup.ts'

function fakeDns(fail = false) {
  const removed: string[][] = []
  const dns: DnsClient = {
    async create() {
      return []
    },
    async remove(ids) {
      removed.push(ids)
      if (fail) throw new Error('dns down')
    },
    async listManaged() {
      return []
    },
  }
  return { dns, removed }
}

function fakeRedirects() {
  const removed: string[][] = []
  const client: RedirectClient = {
    async add() {
      return ''
    },
    async remove(ids) {
      removed.push(ids)
    },
    async listManaged() {
      return []
    },
  }
  return { client, removed }
}

test('cf_record_ids 를 DNS 레코드 id 와 목록 항목 id(접두어 뗌)로 나눈다', () => {
  assert.deepEqual(splitCloudflareIds(['r1', 'redirect:i1', 'r2']), { dns: ['r1', 'r2'], redirect: ['i1'] })
  assert.deepEqual(splitCloudflareIds([]), { dns: [], redirect: [] })
})

test('바로가기 항목이 없으면 목록 클라이언트를 만들지 않는다(목록 env 없이도 CNAME 정리)', async () => {
  const { dns, removed } = fakeDns()
  await removeCloudflareWith(['r1', 'r2'], {
    dns,
    redirects: () => {
      throw new Error('should not be called')
    },
  })
  assert.deepEqual(removed, [['r1', 'r2']])
})

test('둘 다 지우고, DNS 가 실패해도 목록 삭제는 시도한 뒤 던진다', async () => {
  const { dns } = fakeDns(true)
  const r = fakeRedirects()
  await assert.rejects(removeCloudflareWith(['r1', 'redirect:i1'], { dns, redirects: () => r.client }), /dns down/)
  assert.deepEqual(r.removed, [['i1']])
})
