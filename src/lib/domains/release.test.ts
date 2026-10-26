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
