import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { DnsClient, DnsRecordInput } from './cloudflare.ts'
import type { RedirectClient } from './redirects.ts'
import { activateRedirect, connectionLive, createPlaceholder, placeholderTarget } from './activate.ts'

function harness(opts: { addFails?: boolean; setFails?: Error } = {}) {
  const log: string[] = []
  const created: DnsRecordInput[][] = []
  const dns: DnsClient = {
    async create(rows) {
      created.push(rows)
      log.push('dns.create')
      return ['rec1']
    },
    async remove(ids) {
      log.push(`dns.remove:${ids.join(',')}`)
    },
    async listManaged() {
      return []
    },
  }
  const added: { source: string; target: string; keepPath?: boolean; rowId: string }[] = []
  const redirects: RedirectClient = {
    async add(item, rowId) {
      added.push({ ...item, rowId })
      log.push('redirect.add')
      if (opts.addFails) throw new Error('list down')
      return 'it1'
    },
    async remove(ids) {
      log.push(`redirect.remove:${ids.join(',')}`)
    },
    async listManaged() {
      return []
    },
  }
  const recorded: string[][] = []
  const deps = {
    dns,
    redirects: () => redirects,
    setRecords: async (ids: string[]) => {
      log.push('setRecords')
      if (opts.setFails) throw opts.setFails
      recorded.push(ids)
    },
  }
  return { deps, log, created, added, recorded }
}

const ROW = { id: 'row-1', name: 'meal', target: 'meal.acct.workers.dev' }

test('성공하면 proxied AAAA 와 목록 항목을 만들고 id 를 기록한다', async () => {
  const h = harness()
  await activateRedirect(h.deps, ROW)
  assert.deepEqual(h.created, [[{ type: 'AAAA', name: 'meal.dshs.dev', content: '100::' }]])
  assert.deepEqual(h.added, [{ source: 'meal.dshs.dev/', target: 'https://meal.acct.workers.dev/', rowId: 'row-1' }])
  assert.deepEqual(h.recorded, [['rec1', 'redirect:it1']])
  assert.deepEqual(h.log, ['dns.create', 'redirect.add', 'setRecords'])
})

test('목록 추가가 실패하면 AAAA 를 지우고 던진다', async () => {
  const h = harness({ addFails: true })
  await assert.rejects(activateRedirect(h.deps, ROW), /list down/)
  assert.deepEqual(h.log, ['dns.create', 'redirect.add', 'dns.remove:rec1'])
  assert.deepEqual(h.recorded, [])
})

test('기록이 records_exist 로 실패하면(동시 활성화) 만든 것을 모두 지우고 던진다', async () => {
  const h = harness({ setFails: new Error('records_exist') })
  await assert.rejects(activateRedirect(h.deps, ROW), /records_exist/)
  assert.deepEqual(h.log, ['dns.create', 'redirect.add', 'setRecords', 'dns.remove:rec1', 'redirect.remove:it1'])
})

test('connectionLive: 바로가기 행은 목록 항목이 있어야 살아 있는 연결', () => {
  assert.equal(connectionLive({ host: 'firebase', cf_record_ids: [] }), false)
  assert.equal(connectionLive({ host: 'cloudflare-workers', cf_record_ids: ['rec1'] }), false)
  assert.equal(connectionLive({ host: 'firebase', cf_record_ids: ['rec1', 'redirect:it1'] }), true)
  assert.equal(connectionLive({ host: 'vercel', cf_record_ids: ['rec1'] }), true)
  assert.equal(connectionLive({ host: null, cf_record_ids: [] }), false)
})

test('자리표시: AAAA → 경로를 붙이지 않는 경고 페이지 바로가기 → 기록', async () => {
  const h = harness()
  await createPlaceholder(h.deps, { id: 'row-1', name: 'meal' })
  assert.equal(placeholderTarget('meal'), 'https://dshs.dev/pending-domain/meal')
  assert.deepEqual(h.created, [[{ type: 'AAAA', name: 'meal.dshs.dev', content: '100::' }]])
  assert.deepEqual(h.added, [{ source: 'meal.dshs.dev/', target: 'https://dshs.dev/pending-domain/meal', keepPath: false, rowId: 'row-1' }])
  assert.deepEqual(h.recorded, [['rec1', 'redirect:it1']])
})

test('자리표시 목록 추가가 실패하면 AAAA 를 지우고 던진다', async () => {
  const h = harness({ addFails: true })
  await assert.rejects(createPlaceholder(h.deps, { id: 'row-1', name: 'meal' }), /list down/)
  assert.deepEqual(h.log, ['dns.create', 'redirect.add', 'dns.remove:rec1'])
})

test('목록 설정이 없으면 DNS 를 건드리기 전에 실패한다', async () => {
  const h = harness()
  const deps = {
    ...h.deps,
    redirects: () => {
      throw new Error('no list env')
    },
  }
  await assert.rejects(activateRedirect(deps, ROW), /no list env/)
  assert.deepEqual(h.log, [])
})
