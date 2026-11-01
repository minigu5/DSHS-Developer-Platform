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

// ── 대곽나루: 허브 묶기 → proxied CNAME → DB 순서
import { runConnectNaru } from './connect.ts'
import { NaruError } from './naru.ts'
import type { DnsRecordInput } from './cloudflare.ts'

function naruHarness(over: { bind?: () => Promise<{ target: string }>; dnsFails?: boolean; rpc?: (ids: string[], target: string) => Promise<void>; clearOld?: () => Promise<void> } = {}) {
  const events: string[] = []
  let created: DnsRecordInput[] = []
  const deps = {
    naru: {
      bind: async (serverId: string, email: string, name: string) => {
        events.push(`bind:${serverId}:${name}`)
        void email
        return over.bind ? over.bind() : { target: '0000.cfargotunnel.com' }
      },
      unbind: async (serverId: string) => {
        events.push(`unbind:${serverId}`)
      },
    },
    dns: {
      create: async (rows: DnsRecordInput[]) => {
        events.push('dns.create')
        if (over.dnsFails) throw new Error('cf down')
        created = rows
        return ['rec0']
      },
      remove: async (ids: string[]) => {
        events.push(`dns.remove:${ids.join(',')}`)
      },
      listManaged: async () => [],
    },
    rpcConnect: async (ids: string[], target: string) => {
      events.push(`rpc:${ids.join(',')}:${target}`)
      if (over.rpc) await over.rpc(ids, target)
    },
    clearOld: over.clearOld,
  }
  return { deps, events, created: () => created }
}
const INPUT = { id: 'row-1', name: 'meal', serverId: 'fa4e0001', email: 'a@ts.hs.kr' }

test('허브 묶기 실패면 DNS를 만들지 않는다', async () => {
  const h = naruHarness({ bind: async () => { throw new NaruError('down', 0) } })
  await assert.rejects(runConnectNaru(h.deps, INPUT), (e) => e instanceof NaruError && e.status === 0)
  assert.deepEqual(h.events, ['bind:fa4e0001:meal'])
})

test('묶기 → proxied CNAME(대상=허브가 준 target) → DB 순서', async () => {
  const h = naruHarness({ clearOld: async () => { h.events.push('clearOld') } })
  await runConnectNaru(h.deps, INPUT)
  assert.deepEqual(h.events, ['bind:fa4e0001:meal', 'clearOld', 'dns.create', 'rpc:rec0:0000.cfargotunnel.com'])
  assert.deepEqual(h.created(), [{ type: 'CNAME', name: 'meal.dshs.dev', content: '0000.cfargotunnel.com', proxied: true }])
})

test('DB 기록 실패면 DNS 지우고 허브 풀고 원래 오류를 던진다', async () => {
  const boom = new Error('naru_server_taken')
  const h = naruHarness({ rpc: async () => { throw boom } })
  await assert.rejects(runConnectNaru(h.deps, INPUT), (e) => e === boom)
  assert.deepEqual(h.events, ['bind:fa4e0001:meal', 'dns.create', 'rpc:rec0:0000.cfargotunnel.com', 'dns.remove:rec0', 'unbind:fa4e0001'])
})

test('DNS 만들기 실패면 허브 묶음을 푼다', async () => {
  const h = naruHarness({ dnsFails: true })
  await assert.rejects(runConnectNaru(h.deps, INPUT), /cf down/)
  assert.deepEqual(h.events, ['bind:fa4e0001:meal', 'dns.create', 'unbind:fa4e0001'])
})

test('옛 레코드 지우기가 실패해도 허브 묶음을 푼다', async () => {
  const h = naruHarness({ clearOld: async () => { throw new Error('cf down') } })
  await assert.rejects(runConnectNaru(h.deps, INPUT), /cf down/)
  assert.deepEqual(h.events, ['bind:fa4e0001:meal', 'unbind:fa4e0001'])
})
