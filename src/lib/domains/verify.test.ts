import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractToken, checkSite, type Fetcher } from './verify.ts'

const TOKEN = '0123456789abcdef0123456789abcdef'
const FQDN = 'meal.dshs.dev'

type Page = { status: number; headers?: Record<string, string>; body?: string; location?: string }
const fake = (pages: Record<string, Page | 'throw'>): Fetcher => async (url) => {
  const p = pages[url]
  if (p === 'throw' || p === undefined) throw new Error('network')
  return { status: p.status, headers: new Headers(p.headers ?? {}), body: p.body ?? '', location: p.location ?? null }
}
const html = (meta: string) => `<!doctype html><html><head>${meta}<title>x</title></head><body></body></html>`

test('meta 태그 속성 순서·따옴표와 상관없이 토큰을 꺼낸다', () => {
  assert.equal(extractToken(html(`<meta name="dshs-verify" content="${TOKEN}">`)), TOKEN)
  assert.equal(extractToken(html(`<meta content='${TOKEN}' name='dshs-verify' />`)), TOKEN)
  assert.equal(extractToken(html(`<META NAME="DSHS-VERIFY" CONTENT="${TOKEN}">`)), TOKEN)
  assert.equal(extractToken(html('<meta name="description" content="hi">')), null)
})

test('토큰이 맞으면 ok', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({ 'https://meal.dshs.dev/': { status: 200, body: html(`<meta name="dshs-verify" content="${TOKEN}">`) } }))
  assert.deepEqual(r, { kind: 'ok' })
})

test('다른 토큰이면 no_token', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({
    'https://meal.dshs.dev/': { status: 200, body: html('<meta name="dshs-verify" content="ffff">') },
    'https://meal.dshs.dev/.well-known/dshs-verify.txt': { status: 404 },
  }))
  assert.deepEqual(r, { kind: 'no_token' })
})

test('.well-known 파일로도 인정', async () => {
  const r = await checkSite(FQDN, TOKEN, 'netlify', fake({
    'https://meal.dshs.dev/': { status: 200, body: '{}' },
    'https://meal.dshs.dev/.well-known/dshs-verify.txt': { status: 200, body: `${TOKEN}\n` },
  }))
  assert.deepEqual(r, { kind: 'ok' })
})

test('다른 호스트로 리다이렉트하면 토큰이 있어도 unreachable', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({
    'https://meal.dshs.dev/': { status: 301, location: 'https://evil.vercel.app/' },
    'https://evil.vercel.app/': { status: 200, body: html(`<meta name="dshs-verify" content="${TOKEN}">`) },
  }))
  assert.equal(r.kind, 'unreachable')
})

test('같은 호스트 안 리다이렉트(상대 경로 포함)는 따라간다', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({
    'https://meal.dshs.dev/': { status: 307, location: '/ko' },
    'https://meal.dshs.dev/ko': { status: 200, body: html(`<meta name="dshs-verify" content="${TOKEN}">`) },
  }))
  assert.deepEqual(r, { kind: 'ok' })
})

test('리다이렉트는 3번까지', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({
    'https://meal.dshs.dev/': { status: 302, location: '/a' },
    'https://meal.dshs.dev/a': { status: 302, location: '/b' },
    'https://meal.dshs.dev/b': { status: 302, location: '/c' },
    'https://meal.dshs.dev/c': { status: 302, location: '/d' },
    'https://meal.dshs.dev/d': { status: 200, body: html(`<meta name="dshs-verify" content="${TOKEN}">`) },
  }))
  assert.equal(r.kind, 'unreachable')
})

test('호스트의 "사이트 없음" 페이지는 not_found_page', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({
    'https://meal.dshs.dev/': { status: 404, headers: { 'x-vercel-error': 'DEPLOYMENT_NOT_FOUND' } },
  }))
  assert.deepEqual(r, { kind: 'not_found_page' })
})

test('네트워크 오류는 unreachable', async () => {
  const r = await checkSite(FQDN, TOKEN, 'vercel', fake({ 'https://meal.dshs.dev/': 'throw' }))
  assert.equal(r.kind, 'unreachable')
})
