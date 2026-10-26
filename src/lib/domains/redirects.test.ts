import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRedirectClient, getRedirectClient, redirectConfigured, redirectItemBody, RedirectError } from './redirects.ts'

type Call = { method: string; url: string; body: unknown }

function fakeFetch(handler: (c: Call, i: number) => { status: number; json: unknown }) {
  const calls: Call[] = []
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const c: Call = { method: init?.method ?? 'GET', url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null }
    calls.push(c)
    const r = handler(c, calls.length - 1)
    return new Response(JSON.stringify(r.json), { status: r.status })
  }) as typeof fetch
  return { f, calls }
}

const ok = (result: unknown, extra: Record<string, unknown> = {}) => ({ status: 200, json: { success: true, errors: [], result, ...extra } })
const fail = (status: number, message: string) => ({ status, json: { success: false, errors: [{ code: 1, message }], result: null } })
const BASE = 'https://api.cloudflare.com/client/v4/accounts/acc1/rules/lists'
const opts = { token: 't', accountId: 'acc1', listId: 'list1', pollMs: 1, maxWaitMs: 50 }

test('목록 항목은 302·경로·쿼리 보존·우리 표시로 만든다', () => {
  assert.deepEqual(redirectItemBody('meal.dshs.dev/', 'https://meal.acct.workers.dev/', 'row-1'), {
    redirect: {
      source_url: 'meal.dshs.dev/',
      target_url: 'https://meal.acct.workers.dev/',
      status_code: 302,
      subpath_matching: true,
      preserve_path_suffix: true,
      preserve_query_string: true,
      include_subdomains: false,
    },
    comment: 'dshs-subdomain:row-1',
  })
})

test('add 는 작업이 끝날 때까지 기다린 뒤 항목 id 를 돌려준다', async () => {
  const { f, calls } = fakeFetch((c, i) => {
    if (i === 0) return ok({ operation_id: 'op1' })
    if (i === 1) return ok({ id: 'op1', status: 'pending' })
    if (i === 2) return ok({ id: 'op1', status: 'completed' })
    return ok([
      { id: 'other', comment: 'dshs-subdomain:row-9', redirect: { source_url: 'meal.dshs.dev/' } },
      { id: 'it1', comment: 'dshs-subdomain:row-1', redirect: { source_url: 'meal.dshs.dev/' } },
    ])
  })
  const id = await createRedirectClient({ ...opts, fetch: f }).add({ source: 'meal.dshs.dev/', target: 'https://meal.web.app/' }, 'row-1')
  assert.equal(id, 'it1')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].url, `${BASE}/list1/items`)
  assert.deepEqual(calls[0].body, [redirectItemBody('meal.dshs.dev/', 'https://meal.web.app/', 'row-1')])
  assert.equal(calls[1].url, `${BASE}/bulk_operations/op1`)
  assert.equal(calls[3].method, 'GET')
  assert.equal(calls[3].url, `${BASE}/list1/items?search=${encodeURIComponent('meal.dshs.dev/')}`)
})

test('작업이 failed 면 RedirectError', async () => {
  const { f } = fakeFetch((c, i) => (i === 0 ? ok({ operation_id: 'op1' }) : ok({ id: 'op1', status: 'failed', error: 'duplicate source url' })))
  await assert.rejects(
    createRedirectClient({ ...opts, fetch: f }).add({ source: 'a.dshs.dev/', target: 'https://a.web.app/' }, 'r'),
    (e) => e instanceof RedirectError && e.message.includes('duplicate source url'),
  )
})

test('작업이 시간 안에 안 끝나면 RedirectError', async () => {
  const { f } = fakeFetch((c, i) => (i === 0 ? ok({ operation_id: 'op1' }) : ok({ id: 'op1', status: 'running' })))
  await assert.rejects(
    createRedirectClient({ ...opts, fetch: f }).add({ source: 'a.dshs.dev/', target: 'https://a.web.app/' }, 'r'),
    RedirectError,
  )
})

test('목록에 진행 중 작업이 있어 거절되면 다시 시도한다', async () => {
  const { f, calls } = fakeFetch((c, i) => {
    if (i === 0) return fail(409, 'list has a pending operation')
    if (i === 1) return ok({ operation_id: 'op1' })
    if (i === 2) return ok({ id: 'op1', status: 'completed' })
    return ok([{ id: 'it1', comment: 'dshs-subdomain:r', redirect: { source_url: 'a.dshs.dev/' } }])
  })
  assert.equal(await createRedirectClient({ ...opts, fetch: f }).add({ source: 'a.dshs.dev/', target: 'https://a.web.app/' }, 'r'), 'it1')
  assert.equal(calls.filter((c) => c.method === 'POST').length, 2)
})

test('계속 거절되면 3번 시도 뒤 RedirectError', async () => {
  const { f, calls } = fakeFetch(() => fail(400, 'nope'))
  await assert.rejects(createRedirectClient({ ...opts, fetch: f }).remove(['a']), RedirectError)
  assert.equal(calls.length, 3)
})

test('remove 는 id 목록을 DELETE 본문으로 보낸다', async () => {
  const { f, calls } = fakeFetch((c, i) => (i === 0 ? ok({ operation_id: 'op2' }) : ok({ id: 'op2', status: 'completed' })))
  await createRedirectClient({ ...opts, fetch: f }).remove(['a', 'b'])
  assert.equal(calls[0].method, 'DELETE')
  assert.equal(calls[0].url, `${BASE}/list1/items`)
  assert.deepEqual(calls[0].body, { items: [{ id: 'a' }, { id: 'b' }] })
})

test('remove 빈 배열이면 요청하지 않는다', async () => {
  const { f, calls } = fakeFetch(() => ok(null))
  await createRedirectClient({ ...opts, fetch: f }).remove([])
  assert.equal(calls.length, 0)
})

test('listManaged 는 cursor 를 따라가고 우리 항목만', async () => {
  const { f, calls } = fakeFetch((c, i) =>
    i === 0
      ? ok([{ id: 'a', comment: 'dshs-subdomain:r1', redirect: { source_url: 'a.dshs.dev/' } }, { id: 'x', redirect: { source_url: 'x.example.com/' } }], {
          result_info: { cursors: { after: 'cur1' } },
        })
      : ok([{ id: 'b', comment: 'dshs-subdomain:r2', redirect: { source_url: 'b.dshs.dev/' } }], { result_info: { cursors: {} } }),
  )
  const items = await createRedirectClient({ ...opts, fetch: f }).listManaged()
  assert.deepEqual(items, [
    { id: 'a', source: 'a.dshs.dev/', comment: 'dshs-subdomain:r1' },
    { id: 'b', source: 'b.dshs.dev/', comment: 'dshs-subdomain:r2' },
  ])
  assert.equal(calls[0].url, `${BASE}/list1/items?per_page=500`)
  assert.equal(calls[1].url, `${BASE}/list1/items?per_page=500&cursor=cur1`)
})

test('진짜 모드인데 목록 환경변수가 없으면 알아볼 수 있는 RedirectError', () => {
  const saved = { real: process.env.DOMAINS_REAL_DNS, token: process.env.CLOUDFLARE_LISTS_API_TOKEN }
  process.env.DOMAINS_REAL_DNS = '1'
  delete process.env.CLOUDFLARE_LISTS_API_TOKEN
  try {
    assert.throws(() => getRedirectClient(), (e) => e instanceof RedirectError && e.message.includes('CLOUDFLARE_LISTS_API_TOKEN'))
  } finally {
    if (saved.real === undefined) delete process.env.DOMAINS_REAL_DNS
    else process.env.DOMAINS_REAL_DNS = saved.real
    if (saved.token !== undefined) process.env.CLOUDFLARE_LISTS_API_TOKEN = saved.token
  }
})

test('redirectConfigured: 개발(가짜)이면 true, 진짜 모드는 env 셋이 다 있어야 true', () => {
  const keys = ['DOMAINS_REAL_DNS', 'CLOUDFLARE_LISTS_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_REDIRECT_LIST_ID'] as const
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]))
  try {
    for (const k of keys) delete process.env[k]
    assert.equal(redirectConfigured(), true)
    process.env.DOMAINS_REAL_DNS = '1'
    assert.equal(redirectConfigured(), false)
    process.env.CLOUDFLARE_LISTS_API_TOKEN = 't'
    process.env.CLOUDFLARE_ACCOUNT_ID = 'a'
    process.env.CLOUDFLARE_REDIRECT_LIST_ID = 'l'
    assert.equal(redirectConfigured(), true)
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
})
