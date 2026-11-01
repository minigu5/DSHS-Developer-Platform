import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNaruClient, naruLinkFor, NaruError } from './naru.ts'

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
