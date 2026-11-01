import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNaruClient, naruLinkFor, naruReleases, NaruError, toPickableServers, planNaruSync, runNaruSync, unbindNaruBestEffort, type NaruRow } from './naru.ts'

type Call = { method: string; url: string; headers: Record<string, string>; body: unknown }

function fakeFetch(handler: (c: Call) => { status: number; json?: unknown } | Error) {
  const calls: Call[] = []
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const c: Call = {
      method: init?.method ?? 'GET',
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }
    calls.push(c)
    const r = handler(c)
    if (r instanceof Error) throw r
    return new Response(r.status === 204 ? null : JSON.stringify(r.json ?? {}), { status: r.status })
  }) as typeof fetch
  return { f, calls }
}

const HUB = 'https://hub.example.test'

test('listServers: 헤더 x-devplatform-key 와 email 쿼리, camelCase 로 바꿈', async () => {
  const { f, calls } = fakeFetch(() => ({
    status: 200,
    json: { servers: [{ id: 'fa4e0001', name: 'web', status: 'running', node_id: 'server-09', domain: 'meal', target: 'a.cfargotunnel.com' }] },
  }))
  const naru = createNaruClient({ url: HUB + '/', key: 'k1', fetch: f })
  const servers = await naru.listServers('a+b@ts.hs.kr')
  assert.deepEqual(servers, [
    { id: 'fa4e0001', name: 'web', status: 'running', nodeId: 'server-09', domain: 'meal', target: 'a.cfargotunnel.com' },
  ])
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls[0].url, `${HUB}/devplatform/servers?email=a%2Bb%40ts.hs.kr`)
  assert.equal(calls[0].headers['x-devplatform-key'], 'k1')
})

test('listServers: 비어 있는 값은 null 로', async () => {
  const { f } = fakeFetch(() => ({ status: 200, json: { servers: [{ id: 'fa4e0001', name: 'w', status: 'stopped' }] } }))
  const [s] = await createNaruClient({ url: HUB, key: 'k', fetch: f }).listServers('x@ts.hs.kr')
  assert.deepEqual([s.nodeId, s.domain, s.target], [null, null, null])
})

test('bind: 본문은 email·name, 응답의 target 을 돌려준다', async () => {
  const { f, calls } = fakeFetch(() => ({ status: 200, json: { target: '0000.cfargotunnel.com' } }))
  const out = await createNaruClient({ url: HUB, key: 'k', fetch: f }).bind('fa4e0001', 'a@ts.hs.kr', 'meal')
  assert.deepEqual(out, { target: '0000.cfargotunnel.com' })
  assert.equal(calls[0].method, 'PUT')
  assert.equal(calls[0].url, `${HUB}/devplatform/servers/fa4e0001/domain`)
  assert.deepEqual(calls[0].body, { email: 'a@ts.hs.kr', name: 'meal' })
})

test('bind: 404 → NaruError status 404, 네트워크 실패 → status 0', async () => {
  const notFound = fakeFetch(() => ({ status: 404, json: { detail: 'no' } }))
  await assert.rejects(
    createNaruClient({ url: HUB, key: 'k', fetch: notFound.f }).bind('fa4e0001', 'a@ts.hs.kr', 'meal'),
    (e: unknown) => e instanceof NaruError && e.status === 404,
  )
  const down = fakeFetch(() => new TypeError('fetch failed'))
  await assert.rejects(
    createNaruClient({ url: HUB, key: 'k', fetch: down.f }).bind('fa4e0001', 'a@ts.hs.kr', 'meal'),
    (e: unknown) => e instanceof NaruError && e.status === 0,
  )
})

test('bind: target 이 없는 200 은 오류로 본다', async () => {
  const { f } = fakeFetch(() => ({ status: 200, json: {} }))
  await assert.rejects(createNaruClient({ url: HUB, key: 'k', fetch: f }).bind('fa4e0001', 'a@ts.hs.kr', 'meal'), NaruError)
})

test('unbind: DELETE ?email= , 204 면 끝', async () => {
  const { f, calls } = fakeFetch(() => ({ status: 204 }))
  await createNaruClient({ url: HUB, key: 'k', fetch: f }).unbind('fa4e0001', 'a@ts.hs.kr')
  assert.equal(calls[0].method, 'DELETE')
  assert.equal(calls[0].url, `${HUB}/devplatform/servers/fa4e0001/domain?email=a%40ts.hs.kr`)
})

test('sync: bindings 키 이름이 server_id/email/name', async () => {
  const { f, calls } = fakeFetch(() => ({ status: 200, json: { gone: ['fa4e0002'] } }))
  const out = await createNaruClient({ url: HUB, key: 'k', fetch: f }).sync([
    { serverId: 'fa4e0001', email: 'a@ts.hs.kr', name: 'meal' },
    { serverId: 'fa4e0002', email: 'b@ts.hs.kr', name: 'blog' },
  ])
  assert.deepEqual(out, { gone: ['fa4e0002'] })
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].url, `${HUB}/devplatform/sync`)
  assert.deepEqual(calls[0].body, {
    bindings: [
      { server_id: 'fa4e0001', email: 'a@ts.hs.kr', name: 'meal' },
      { server_id: 'fa4e0002', email: 'b@ts.hs.kr', name: 'blog' },
    ],
  })
})

test('sync: 5xx → NaruError status 그대로', async () => {
  const { f } = fakeFetch(() => ({ status: 503 }))
  await assert.rejects(createNaruClient({ url: HUB, key: 'k', fetch: f }).sync([]), (e: unknown) => e instanceof NaruError && e.status === 503)
})

test('naruLinkFor 는 서버 id 를 붙이지 않는다', () => {
  assert.equal(naruLinkFor('fa4e0001'), 'https://대곽나루.dshs-app.net/dashboard?view=server')
})

test('unbindNaruBestEffort: 대곽나루 행만 풀고, 실패는 로그만', async () => {
  const unbound: string[] = []
  const logs: string[] = []
  const naru = { unbind: async (id: string) => { unbound.push(id) } }
  const log = (m: string) => logs.push(m)
  await unbindNaruBestEffort(naru, { host: 'naru', naruServerId: 'fa4e0001', ownerEmail: 'a@ts.hs.kr' }, log)
  await unbindNaruBestEffort(naru, { host: 'vercel', naruServerId: null, ownerEmail: 'a@ts.hs.kr' }, log)
  await unbindNaruBestEffort(naru, { host: 'naru', naruServerId: 'fa4e0002', ownerEmail: null }, log)
  await unbindNaruBestEffort(null, { host: 'naru', naruServerId: 'fa4e0003', ownerEmail: 'a@ts.hs.kr' }, log)
  assert.deepEqual(unbound, ['fa4e0001'])
  await unbindNaruBestEffort({ unbind: async () => { throw new NaruError('x', 0) } }, { host: 'naru', naruServerId: 'fa4e0004', ownerEmail: 'a@ts.hs.kr' }, log)
  assert.ok(logs.length >= 1)
  assert.ok(logs.every((l) => !l.includes('@')))
})

// ── 매일 점검: 대곽나루 행은 sync

const ROW = (n: number, over: Partial<NaruRow> = {}): NaruRow => ({
  id: `row-${n}`, naruServerId: `fa4e000${n}`, ownerEmail: `s${n}@ts.hs.kr`, name: `site${n}`, ...over,
})

test('planNaruSync 는 live 대곽나루 행만 묶음으로', () => {
  const rows: NaruRow[] = [
    ROW(1),
    ROW(2, { host: 'vercel' }),
    ROW(3, { status: 'released' }),
    ROW(4, { host: 'naru', status: 'active' }),
  ]
  assert.deepEqual(planNaruSync(rows), [
    { serverId: 'fa4e0001', email: 's1@ts.hs.kr', name: 'site1' },
    { serverId: 'fa4e0004', email: 's4@ts.hs.kr', name: 'site4' },
  ])
})

test('naruReleases: gone 이면 반납, 아니면 그대로', () => {
  const rows = [ROW(1), ROW(2), ROW(3)]
  assert.deepEqual(naruReleases(rows, ['fa4e0002', 'zzzzzzzz']), ['row-2'])
  assert.deepEqual(naruReleases(rows, []), [])
})

function syncHarness(over: {
  load?: () => Promise<NaruRow[]>
  sync?: (b: { serverId: string; email: string; name: string }[]) => Promise<{ gone: string[] }>
  noHub?: boolean
  dryRun?: boolean
  releaseFails?: string
} = {}) {
  const events: string[] = []
  const lines: string[] = []
  const deps = {
    naru: over.noHub
      ? null
      : {
          sync: async (b: { serverId: string; email: string; name: string }[]) => {
            events.push(`sync:${b.length}`)
            return over.sync ? over.sync(b) : { gone: [] }
          },
        },
    loadRows: over.load ?? (async () => [ROW(1), ROW(2)]),
    release: async (row: NaruRow) => {
      events.push(`release:${row.id}`)
      if (over.releaseFails === row.id) throw new Error('db')
    },
    dryRun: over.dryRun ?? false,
    log: (m: string) => lines.push(m),
  }
  return { deps, events, lines }
}

test('조회 실패면 sync를 부르지 않는다', async () => {
  const h = syncHarness({ load: async () => { throw new Error('supabase down') } })
  const r = await runNaruSync(h.deps)
  assert.deepEqual(h.events, [])
  assert.equal(r.failures, 1)
})

test('sync 가 돌려준 gone 행만 반납한다', async () => {
  const h = syncHarness({ sync: async () => ({ gone: ['fa4e0002'] }) })
  const r = await runNaruSync(h.deps)
  assert.deepEqual(h.events, ['sync:2', 'release:row-2'])
  assert.deepEqual(r, { failures: 0, released: ['site2'] })
})

test('허브가 안 닿으면(0·5xx) 반납 없이 건너뛴다, 실패로 세지 않는다', async () => {
  for (const status of [0, 502, 503]) {
    const h = syncHarness({ sync: async () => { throw new NaruError('x', status) } })
    const r = await runNaruSync(h.deps)
    assert.deepEqual(h.events, ['sync:2'])
    assert.equal(r.failures, 0)
    assert.ok(h.lines.some((l) => l.includes('건너뜀')))
  }
})

test('허브가 거절하면(401 등) 실패로 센다, 반납 없음', async () => {
  const h = syncHarness({ sync: async () => { throw new NaruError('x', 401) } })
  const r = await runNaruSync(h.deps)
  assert.equal(r.failures, 1)
  assert.deepEqual(h.events, ['sync:2'])
})

test('dry-run 은 허브를 부르지 않고 계획만 낸다(이메일은 안 찍는다)', async () => {
  const h = syncHarness({ dryRun: true })
  const r = await runNaruSync(h.deps)
  assert.deepEqual(h.events, [])
  assert.equal(r.failures, 0)
  assert.ok(h.lines.some((l) => l.includes('site1')))
  assert.ok(h.lines.every((l) => !l.includes('@')))
})

test('허브 설정이 없는데 대곽나루 행이 있으면 실패, 행이 없으면 조용히 끝', async () => {
  assert.equal((await runNaruSync(syncHarness({ noHub: true }).deps)).failures, 1)
  const empty = syncHarness({ noHub: true, load: async () => [] })
  assert.equal((await runNaruSync(empty.deps)).failures, 0)
})

test('행이 0개여도 허브가 있으면 빈 목록으로 맞춘다(조회가 성공했을 때만)', async () => {
  const h = syncHarness({ load: async () => [] })
  await runNaruSync(h.deps)
  assert.deepEqual(h.events, ['sync:0'])
})

test('반납이 한 행에서 실패해도 나머지를 계속하고 실패로 센다', async () => {
  const h = syncHarness({ sync: async () => ({ gone: ['fa4e0001', 'fa4e0002'] }), releaseFails: 'row-1' })
  const r = await runNaruSync(h.deps)
  assert.deepEqual(h.events, ['sync:2', 'release:row-1', 'release:row-2'])
  assert.equal(r.failures, 1)
  assert.deepEqual(r.released, ['site2'])
})

test('대량 반납 방어: gone 이 2개 초과이고 절반 넘으면 아무것도 반납하지 않고 실패(이메일 안 찍음)', async () => {
  const rows = [ROW(1), ROW(2), ROW(3), ROW(4), ROW(5)]
  const h = syncHarness({ load: async () => rows, sync: async () => ({ gone: ['fa4e0001', 'fa4e0002', 'fa4e0003'] }) })
  const r = await runNaruSync(h.deps)
  assert.deepEqual(h.events, ['sync:5'])
  assert.deepEqual(r, { failures: 1, released: [] })
  assert.ok(h.lines.some((l) => l.includes('❌') && l.includes('site1')))
  assert.ok(h.lines.every((l) => !l.includes('@')))
})

test('대량 반납 방어 경계: 절반 이하이거나 2개 이하면 그대로 반납', async () => {
  // 3개 / 6개 = 정확히 절반 → 통과
  const six = syncHarness({
    load: async () => [1, 2, 3, 4, 5, 6].map((n) => ROW(n)),
    sync: async () => ({ gone: ['fa4e0001', 'fa4e0002', 'fa4e0003'] }),
  })
  const r6 = await runNaruSync(six.deps)
  assert.equal(r6.failures, 0)
  assert.deepEqual(r6.released, ['site1', 'site2', 'site3'])
  // 2개 / 2개 = 전부지만 2개 이하라 통과
  const two = syncHarness({ sync: async () => ({ gone: ['fa4e0001', 'fa4e0002'] }) })
  const r2 = await runNaruSync(two.deps)
  assert.equal(r2.failures, 0)
  assert.deepEqual(r2.released, ['site1', 'site2'])
})

test('toPickableServers: running·stopped 만, target 이 없으면 ready=false, 내부 값은 지움', () => {
  const mk = (id: string, status: string, target: string | null) => ({ id, name: id, status, nodeId: 'server-09', domain: null, target })
  const out = toPickableServers([mk('a', 'running', 'x.cfargotunnel.com'), mk('b', 'stopped', null), mk('c', 'creating', 'x.cfargotunnel.com')])
  assert.deepEqual(out.map((s) => [s.id, s.ready, s.nodeId, s.target]), [['a', true, null, null], ['b', false, null, null]])
})
