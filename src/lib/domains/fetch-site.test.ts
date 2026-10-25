import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSiteFetcher, MAX_BODY_BYTES } from './fetch-site.ts'

test('리다이렉트는 따라가지 않고 location 을 돌려준다', async () => {
  let init: RequestInit | undefined
  const f = (async (_u: string | URL | Request, i?: RequestInit) => {
    init = i
    return new Response(null, { status: 301, headers: { location: '/ko' } })
  }) as typeof fetch
  const page = await createSiteFetcher(f)('https://meal.dshs.dev/')
  assert.equal(page.status, 301)
  assert.equal(page.location, '/ko')
  assert.equal(init?.redirect, 'manual')
})

test('본문은 앞 256KB 만 읽는다', async () => {
  const big = 'a'.repeat(MAX_BODY_BYTES + 5000)
  const f = (async () => new Response(big, { status: 200 })) as unknown as typeof fetch
  const page = await createSiteFetcher(f)('https://meal.dshs.dev/')
  assert.equal(page.body.length, MAX_BODY_BYTES)
})
