// cd relay && node --test test/ — 서울 입구 중계(서버 먼저, 안 되면 Worker)
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { forwardWithFallback, resetCircuit } from '../lib/forward.js'

const env = (over = {}) => ({
  ORIGIN_HOST: 'origin.example',
  ORIGIN_KEY: 'secret-key',
  PUBLIC_HOST: 'dshs.dev',
  APP: { fetch: async (req) => new Response(`worker:${req.method}:${await req.text()}`, { status: 200 }) },
  ...over,
})
const req = (path = '/a?b=1', init = {}) =>
  new Request(`https://dshs.dev${path}`, { ...init, headers: { 'cf-connecting-ip': '203.0.113.7', ...(init.headers ?? {}) } })
const nginx = (status) => new Response(`<html><center><h1>${status}</h1></center><hr><center>nginx</center></html>`, { status, headers: { 'content-type': 'text/html' } })
const origin = (r) => r.headers.get('x-dshs-origin')

beforeEach(() => resetCircuit())

test('서버가 응답하면 그대로, 사용자 IP·키·공개 호스트를 붙여 원 주소로 보낸다', async () => {
  let seen
  const res = await forwardWithFallback(req('/a?b=1', { headers: { 'x-dshs-client-ip': '6.6.6.6', 'x-dshs-relay-key': 'guess' } }), env(), {
    fetchImpl: async (url, init) => {
      seen = { url, headers: new Headers(init.headers), redirect: init.redirect }
      return new Response('origin', { status: 200 })
    },
  })
  assert.equal(await res.text(), 'origin')
  assert.equal(origin(res), 'naru')
  assert.equal(seen.url, 'https://origin.example/a?b=1')
  assert.equal(seen.headers.get('x-dshs-client-ip'), '203.0.113.7')
  assert.equal(seen.headers.get('x-dshs-relay-key'), 'secret-key')
  assert.equal(seen.redirect, 'manual')
})

test('x-forwarded-host 는 요청 주소가 아니라 공개 호스트로 고정(pages.dev 로 들어와도 서버 액션 출처 검사가 dshs.dev 기준)', async () => {
  let seen
  const r = new Request('https://dshs-relay.pages.dev/', { headers: { 'cf-connecting-ip': '203.0.113.7' } })
  await forwardWithFallback(r, env(), { fetchImpl: async (url, init) => { seen = new Headers(init.headers); return new Response('') } })
  assert.equal(seen.get('x-forwarded-host'), 'dshs.dev')
})

test('연결 실패(예외)면 GET·POST 모두 Worker 로 — 서버까지 안 갔으니', async () => {
  const get = await forwardWithFallback(req(), env(), { fetchImpl: async () => { throw new TypeError('connect failed') } })
  assert.equal(origin(get), 'worker')
  resetCircuit()
  const post = await forwardWithFallback(req('/x', { method: 'POST', body: 'abc' }), env(), { fetchImpl: async () => { throw new TypeError('connect failed') } })
  assert.equal(await post.text(), 'worker:POST:abc')
})

test('Cloudflare 521/522/523/530(서버에 못 닿음)은 POST 도 Worker 로', async () => {
  for (const status of [521, 522, 523, 530]) {
    resetCircuit()
    const res = await forwardWithFallback(req('/x', { method: 'POST', body: 'b' }), env(), { fetchImpl: async () => new Response('x', { status }) })
    assert.equal(origin(res), 'worker', String(status))
  }
})

test('nginx 502·503·504 는 페이지 GET 만 Worker 로 — POST·/api·/auth 는 이미 처리됐을 수 있어 그대로', async () => {
  const page = await forwardWithFallback(req('/explore'), env(), { fetchImpl: async () => nginx(502) })
  assert.equal(origin(page), 'worker')
  for (const [path, init] of [['/x', { method: 'POST', body: 'abc' }], ['/api/posters/p1/export'], ['/auth/callback?code=1']]) {
    resetCircuit()
    const res = await forwardWithFallback(req(path, init), env(), { fetchImpl: async () => nginx(502) })
    assert.equal(res.status, 502, path)
    assert.equal(origin(res), 'naru', path)
  }
})

test('앱이 낸 JSON 502 는 서버 장애가 아니다 — GET 이어도 다시 안 보낸다', async () => {
  const res = await forwardWithFallback(req('/explore'), env(), {
    fetchImpl: async () => Response.json({ error: 'render failed' }, { status: 502 }),
  })
  assert.equal(origin(res), 'naru')
})

test('500 은 서버 응답 그대로', async () => {
  const res = await forwardWithFallback(req(), env(), { fetchImpl: async () => new Response('boom', { status: 500 }) })
  assert.equal(res.status, 500)
  assert.equal(origin(res), 'naru')
})

test('페이지 GET 이 시간 안에 머리를 안 주면 Worker 로, /api GET 은 504 로 끝(두 번 실행 방지)', async () => {
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))))
  const page = await forwardWithFallback(req('/explore'), env(), { timeoutMs: 30, fetchImpl: hang })
  assert.equal(origin(page), 'worker')
  resetCircuit()
  const api = await forwardWithFallback(req('/api/posters/p1/export'), env(), { timeoutMs: 30, longTimeoutMs: 30, fetchImpl: hang })
  assert.equal(api.status, 504)
})

test('서버가 안 되면 30초 동안은 서버를 건너뛰고 바로 Worker 로(멈춘 서버에 요청마다 기다리지 않게)', async () => {
  let t = 1_000_000
  const now = () => t
  let calls = 0
  const down = async () => { calls++; throw new TypeError('down') }
  await forwardWithFallback(req(), env(), { fetchImpl: down, now })
  assert.equal(calls, 1)
  const skipped = await forwardWithFallback(req('/x', { method: 'POST', body: 'z' }), env(), { fetchImpl: down, now })
  assert.equal(calls, 1)
  assert.equal(await skipped.text(), 'worker:POST:z')
  t += 31_000
  await forwardWithFallback(req(), env(), { fetchImpl: down, now })
  assert.equal(calls, 2)
})

test('헤더 한 줄이 너무 크면(노드 nginx 32KB 한도에 여유) 서버로 안 보내고 바로 Worker 로', async () => {
  let called = false
  const res = await forwardWithFallback(req('/', { headers: { cookie: `sb=${'a'.repeat(25000)}` } }), env(), {
    fetchImpl: async () => { called = true; return new Response('origin') },
  })
  assert.equal(called, false)
  assert.equal(origin(res), 'worker')
})

test('12KB 쿠키는 서버로', async () => {
  const res = await forwardWithFallback(req('/', { headers: { cookie: `sb=${'a'.repeat(12000)}` } }), env(), { fetchImpl: async () => new Response('origin') })
  assert.equal(origin(res), 'naru')
})

test('nginx "헤더가 너무 크다" 400 은 앱까지 안 갔으니 POST 도 Worker 로', async () => {
  const res = await forwardWithFallback(req('/x', { method: 'POST', body: 'q' }), env(), {
    fetchImpl: async () => new Response('<center>Request Header Or Cookie Too Large</center>', { status: 400 }),
  })
  assert.equal(await res.text(), 'worker:POST:q')
})

test('길이를 안 밝힌 큰 본문은 상한까지만 담고, 넘으면 서버로만(다시 보내지 않음)', async () => {
  const chunk = new Uint8Array(1024)
  const body = new ReadableStream({
    start(c) {
      for (let i = 0; i < 40; i++) c.enqueue(chunk)
      c.close()
    },
  })
  let got = 0
  const res = await forwardWithFallback(new Request('https://dshs.dev/up', { method: 'POST', body, duplex: 'half' }), env(), {
    maxBuffer: 10 * 1024,
    fetchImpl: async (url, init) => {
      got = (await new Response(init.body).arrayBuffer()).byteLength
      return nginx(503)
    },
  })
  assert.equal(got, 40 * 1024) // 서버엔 본문 전부
  assert.equal(res.status, 503) // 다시 못 보내니 그대로
})

test('원 주소로 가는 Location 은 사용자 주소로 고친다', async () => {
  const res = await forwardWithFallback(req(), env(), {
    fetchImpl: async () => new Response(null, { status: 307, headers: { location: 'https://origin.example/login?next=%2F' } }),
  })
  assert.equal(res.headers.get('location'), 'https://dshs.dev/login?next=%2F')
})

test('ORIGIN_HOST 가 없으면 예전처럼 Worker 만', async () => {
  let called = false
  const res = await forwardWithFallback(req(), env({ ORIGIN_HOST: '' }), { fetchImpl: async () => { called = true; return new Response('') } })
  assert.equal(called, false)
  assert.equal(origin(res), 'worker')
})
