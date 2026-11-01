import { test } from 'node:test'
import assert from 'node:assert/strict'
import { releaseLiveDomainWith } from './release.ts'

function deps(over: {
  find?: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  release?: () => Promise<{ data: string[] | null; error: { message: string } | null }>
  removeFails?: boolean
}) {
  const calls: string[] = []
  return {
    calls,
    deps: {
      findLive: async () => {
        calls.push('find')
        return over.find ? over.find() : { data: { id: 'sub-1' }, error: null }
      },
      release: async (id: string) => {
        calls.push(`release:${id}`)
        return over.release ? over.release() : { data: ['rec1', 'redirect:it1'], error: null }
      },
      removeCloudflare: async (ids: string[]) => {
        calls.push(`remove:${ids.join(',')}`)
        if (over.removeFails) throw new Error('cf down')
      },
      log: () => {},
    },
  }
}

test('살아 있는 주소를 반납하고 Cloudflare 레코드(바로가기 항목 포함)를 지운다', async () => {
  const h = deps({})
  assert.equal(await releaseLiveDomainWith(h.deps), true)
  assert.deepEqual(h.calls, ['find', 'release:sub-1', 'remove:rec1,redirect:it1'])
})

test('살아 있는 주소가 없으면 할 일 없이 true', async () => {
  const h = deps({ find: async () => ({ data: null, error: null }) })
  assert.equal(await releaseLiveDomainWith(h.deps), true)
  assert.deepEqual(h.calls, ['find'])
})

test('주소 조회가 실패하면 "없음"으로 보지 않고 false', async () => {
  const h = deps({ find: async () => ({ data: null, error: { message: 'timeout' } }) })
  assert.equal(await releaseLiveDomainWith(h.deps), false)
  assert.deepEqual(h.calls, ['find'])
})

test('DB 반납이 실패하면 false, Cloudflare 는 건드리지 않는다', async () => {
  const h = deps({ release: async () => ({ data: null, error: { message: 'not_live' } }) })
  assert.equal(await releaseLiveDomainWith(h.deps), false)
  assert.deepEqual(h.calls, ['find', 'release:sub-1'])
})

test('Cloudflare 삭제가 실패해도 DB 는 반납됐으니 true(남은 것은 매일 점검이 정리)', async () => {
  const h = deps({ removeFails: true })
  assert.equal(await releaseLiveDomainWith(h.deps), true)
})

// ── 대곽나루 주소 반납: DNS 삭제 뒤 허브 풀기(최선 노력)
test('대곽나루 주소 반납은 DNS 를 지운 뒤 허브 묶음을 푼다', async () => {
  const calls: string[] = []
  const ok = await releaseLiveDomainWith({
    findLive: async () => ({ data: { id: 'sub-1', host: 'naru', naruServerId: 'fa4e0001' }, error: null }),
    release: async () => ({ data: ['rec1'], error: null }),
    removeCloudflare: async (ids) => { calls.push(`remove:${ids.join(',')}`) },
    unbindNaru: async (live) => { calls.push(`unbind:${live.naruServerId}`) },
    log: () => {},
  })
  assert.equal(ok, true)
  assert.deepEqual(calls, ['remove:rec1', 'unbind:fa4e0001'])
})

test('대곽나루 주소 반납은 허브 풀기가 실패해도 성공', async () => {
  const logs: string[] = []
  const ok = await releaseLiveDomainWith({
    findLive: async () => ({ data: { id: 'sub-1', host: 'naru', naruServerId: 'fa4e0001' }, error: null }),
    release: async () => ({ data: ['rec1'], error: null }),
    removeCloudflare: async () => {},
    unbindNaru: async () => { throw new Error('hub down') },
    log: (m) => logs.push(m),
  })
  assert.equal(ok, true)
  assert.equal(logs.length, 1)
})

test('다른 호스트 주소는 허브를 부르지 않는다', async () => {
  let called = false
  await releaseLiveDomainWith({
    findLive: async () => ({ data: { id: 'sub-1', host: 'vercel', naruServerId: null }, error: null }),
    release: async () => ({ data: ['rec1'], error: null }),
    removeCloudflare: async () => {},
    unbindNaru: async () => { called = true },
    log: () => {},
  })
  assert.equal(called, false)
})
