import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSameOrigin } from './same-origin.ts'

// 라우트는 [요청 자신의 origin, NEXT_PUBLIC_SITE_URL] 을 넘긴다 — 옛 vercel.app 주소도 같이 운영 중이라
const ALLOWED = ['https://dshs.dev', 'https://dshs.dev']
const h = (init: Record<string, string>) => new Headers(init)

test('Origin 이 허용 목록에 있으면 통과', () => {
  assert.equal(isSameOrigin(h({ origin: 'https://dshs.dev' }), ALLOWED), true)
})

test('학생 서브도메인 Origin 은 거부', () => {
  assert.equal(isSameOrigin(h({ origin: 'https://meal.dshs.dev' }), ALLOWED), false)
})

test('Origin 이 없으면 Referer 로 판정', () => {
  assert.equal(isSameOrigin(h({ referer: 'https://dshs.dev/projects/new' }), ALLOWED), true)
  assert.equal(isSameOrigin(h({ referer: 'https://meal.dshs.dev/x' }), ALLOWED), false)
})

test('Origin·Referer 둘 다 없으면 거부', () => {
  assert.equal(isSameOrigin(h({}), ALLOWED), false)
})

test('스킴이 다르면 거부', () => {
  assert.equal(isSameOrigin(h({ origin: 'http://dshs.dev' }), ALLOWED), false)
})

test('빈 값·깨진 주소는 허용 목록에서 무시', () => {
  assert.equal(isSameOrigin(h({ origin: 'https://dshs.dev' }), ['', 'not a url']), false)
  assert.equal(isSameOrigin(h({ origin: 'http://localhost:3000' }), ['http://localhost:3000', '']), true)
})
