import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDnsClient, DnsError } from './cloudflare.ts'

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

const ok = (result: unknown) => ({ status: 200, json: { success: true, errors: [], result } })
const BASE = 'https://api.cloudflare.com/client/v4/zones/zone1/dns_records'

test('레코드는 DNS only·자동 TTL·우리 표시(comment)로 만든다', async () => {
  const { f, calls } = fakeFetch((c, i) => ok({ id: `rec${i}` }))
  const dns = createDnsClient({ token: 't', zoneId: 'zone1', fetch: f })
  const ids = await dns.create(
    [
      { type: 'CNAME', name: 'meal.dshs.dev', content: 'abc.vercel-dns-017.com' },
      { type: 'TXT', name: '_vercel.dshs.dev', content: 'vc-domain-verify=meal.dshs.dev,x' },
    ],
    'row-1',
  )
  assert.deepEqual(ids, ['rec0', 'rec1'])
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].url, BASE)
  assert.deepEqual(calls[0].body, {
    type: 'CNAME', name: 'meal.dshs.dev', content: 'abc.vercel-dns-017.com', ttl: 1, proxied: false, comment: 'dshs-subdomain:row-1',
  })
  // TXT 값은 따옴표로 감싼다(Cloudflare 권장 형식)
  assert.equal((calls[1].body as { content: string }).content, '"vc-domain-verify=meal.dshs.dev,x"')
  assert.equal((calls[1].body as { proxied?: boolean }).proxied, undefined)
})

test('중간에 실패하면 이미 만든 레코드를 지우고 DnsError', async () => {
  const { f, calls } = fakeFetch((c, i) =>
    i === 1 ? { status: 400, json: { success: false, errors: [{ code: 81053, message: 'exists' }] } } : ok({ id: 'rec0' }),
  )
  const dns = createDnsClient({ token: 't', zoneId: 'zone1', fetch: f })
  await assert.rejects(
    dns.create(
      [
        { type: 'CNAME', name: 'meal.dshs.dev', content: 'a.netlify.app' },
        { type: 'TXT', name: '_x.meal.dshs.dev', content: 'y' },
      ],
      'row-1',
    ),
    DnsError,
  )
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), [`POST ${BASE}`, `POST ${BASE}`, `DELETE ${BASE}/rec0`])
})

test('지울 때 이미 없는 레코드(404)는 성공으로 본다', async () => {
  const { f } = fakeFetch(() => ({ status: 404, json: { success: false, errors: [{ code: 81044, message: 'not found' }] } }))
  const dns = createDnsClient({ token: 't', zoneId: 'zone1', fetch: f })
  await dns.remove(['gone'])
})

test('지우기 실패(404 말고)는 DnsError', async () => {
  const { f } = fakeFetch(() => ({ status: 500, json: { success: false, errors: [] } }))
  const dns = createDnsClient({ token: 't', zoneId: 'zone1', fetch: f })
  await assert.rejects(dns.remove(['x']), DnsError)
})

test('우리가 만든 레코드 목록은 페이지를 넘겨 모은다', async () => {
  const { f, calls } = fakeFetch((c) => {
    const page = Number(new URL(c.url).searchParams.get('page'))
    return {
      status: 200,
      json: {
        success: true,
        errors: [],
        result: page === 1 ? [{ id: 'a', name: 'meal.dshs.dev', comment: 'dshs-subdomain:r1' }] : [{ id: 'b', name: 'bus.dshs.dev', comment: 'dshs-subdomain:r2' }],
        result_info: { page, total_pages: 2 },
      },
    }
  })
  const dns = createDnsClient({ token: 't', zoneId: 'zone1', fetch: f })
  const rows = await dns.listManaged()
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b'])
  const u = new URL(calls[0].url)
  assert.equal(u.searchParams.get('comment.startswith'), 'dshs-subdomain:')
  assert.equal(u.searchParams.get('per_page'), '100')
})
