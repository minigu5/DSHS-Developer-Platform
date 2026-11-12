// cd relay && node --test test/ — 서울 입구 중계(서버 먼저, 안 되면 Worker)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { forwardWithFallback } from '../lib/forward.js'

const env = (over = {}) => ({
  ORIGIN_HOST: 'origin.example',
  ORIGIN_KEY: 'secret-key',
  APP: { fetch: async (req) => new Response(`worker:${req.method}:${await req.text()}`, { status: 200 }) },
  ...over,
})
const req = (path = '/a?b=1', init = {}) =>
  new Request(`https://dshs.dev${path}`, { ...init, headers: { 'cf-connecting-ip': '203.0.113.7', ...(init.headers ?? {}) } })

test('서버가 응답하면 그대로, 사용자 IP·키를 붙여 원 주소로 보낸다', async () => {
  let seen
  const res = await forwardWithFallback(req('/a?b=1', { headers: { 'x-dshs-client-ip': '6.6.6.6', 'x-dshs-relay-key': 'guess' } }), env(), {
    fetchImpl: async (url, init) => {
      seen = { url, headers: new Headers(init.headers), redirect: init.redirect }
      return new Response('origin', { status: 200 })
    },
  })
  assert.equal(await res.text(), 'origin')
  assert.equal(res.headers.get('x-dshs-origin'), 'naru')
  assert.equal(seen.url, 'https://origin.example/a?b=1')
  assert.equal(seen.headers.get('x-dshs-client-ip'), '203.0.113.7') // 브라우저가 보낸 6.6.6.6 이 아니라
  assert.equal(seen.headers.get('x-dshs-relay-key'), 'secret-key')
  assert.equal(seen.headers.get('x-forwarded-host'), 'dshs.dev')
  assert.equal(seen.redirect, 'manual')
})

test('연결 실패면 Worker 로', async () => {
  const res = await forwardWithFallback(req(), env(), { fetchImpl: async () => { throw new TypeError('connect failed') } })
  assert.equal(res.headers.get('x-dshs-origin'), 'worker')
  assert.equal(await res.text(), 'worker:GET:')
})

test('502·503·530(안 닿음)은 Worker 로, 500 은 서버 응답 그대로', async () => {
  for (const status of [502, 503, 521, 522, 523, 530]) {
    const res = await forwardWithFallback(req(), env(), { fetchImpl: async () => new Response('x', { status }) })
    assert.equal(res.headers.get('x-dshs-origin'), 'worker', String(status))
  }
  const res = await forwardWithFallback(req(), env(), { fetchImpl: async () => new Response('boom', { status: 500 }) })
  assert.equal(res.status, 500)
  assert.equal(res.headers.get('x-dshs-origin'), 'naru')
})

test('POST 본문은 실패 뒤 Worker 에도 그대로', async () => {
  const res = await forwardWithFallback(req('/x', { method: 'POST', body: 'abc' }), env(), { fetchImpl: async () => new Response('', { status: 503 }) })
  assert.equal(await res.text(), 'worker:POST:abc')
})

test('504·524(서버가 처리했을 수도)는 GET 만 Worker 로 다시 — POST 는 두 번 처리 안 되게 그대로', async () => {
  const get = await forwardWithFallback(req(), env(), { fetchImpl: async () => new Response('', { status: 504 }) })
  assert.equal(get.headers.get('x-dshs-origin'), 'worker')
  const post = await forwardWithFallback(req('/x', { method: 'POST', body: 'abc' }), env(), { fetchImpl: async () => new Response('late', { status: 524 }) })
  assert.equal(post.status, 524)
  assert.equal(post.headers.get('x-dshs-origin'), 'naru')
})

test('GET 이 시간 안에 머리를 안 주면 Worker 로', async () => {
  const res = await forwardWithFallback(req(), env(), {
    timeoutMs: 50,
    fetchImpl: (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
  })
  assert.equal(res.headers.get('x-dshs-origin'), 'worker')
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
  assert.equal(res.headers.get('x-dshs-origin'), 'worker')
})

test('헤더 한 줄이 너무 크면(노드 nginx 32KB 한도에 여유) 서버로 안 보내고 바로 Worker 로', async () => {
  let called = false
  const big = 'a'.repeat(25000)
  const res = await forwardWithFallback(req('/', { headers: { cookie: `sb=${big}` } }), env(), {
    fetchImpl: async () => { called = true; return new Response('origin') },
  })
  assert.equal(called, false)
  assert.equal(res.headers.get('x-dshs-origin'), 'worker')
})

test('서버가 "헤더가 너무 크다" 400 을 주면 GET 은 Worker 로', async () => {
  const res = await forwardWithFallback(req(), env(), {
    fetchImpl: async () => new Response('<center>Request Header Or Cookie Too Large</center>', { status: 400 }),
  })
  assert.equal(res.headers.get('x-dshs-origin'), 'worker')
})

test('12KB 쿠키는 이제 서버로(노드 nginx 32KB)', async () => {
  const res = await forwardWithFallback(req('/', { headers: { cookie: `sb=${'a'.repeat(12000)}` } }), env(), { fetchImpl: async () => new Response('origin') })
  assert.equal(res.headers.get('x-dshs-origin'), 'naru')
})
