import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { getGlobalDispatcher, setGlobalDispatcher, type Dispatcher } from 'undici'
import { installSafeDispatcher, safeLookup } from './ssrf-node.ts'

let server: http.Server
let port = 0
let original: Dispatcher

before(async () => {
  server = http.createServer((_req, res) => res.end('inside'))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  original = getGlobalDispatcher()
  installSafeDispatcher()
})

after(() => {
  setGlobalDispatcher(original)
  server.close()
})

function lookupOf(hostname: string): Promise<Error | null> {
  return new Promise((resolve) => safeLookup(hostname, {}, (err) => resolve(err)))
}

test('서버 안(루프백)으로 가는 fetch 는 막힌다 — 이름·IP 둘 다', async () => {
  await assert.rejects(fetch(`http://127.0.0.1:${port}/`))
  await assert.rejects(fetch(`http://localhost:${port}/`))
  await assert.rejects(fetch(`http://[::1]:${port}/`))
})

test('학교망·사설 IP 리터럴도 막힌다', async () => {
  await assert.rejects(fetch('http://10.250.0.1/', { signal: AbortSignal.timeout(3000) }), (e: Error) => {
    // 시간 초과가 아니라 연결 전에 거절돼야 한다
    assert.notEqual((e.cause as Error | undefined)?.name, 'TimeoutError')
    assert.notEqual(e.name, 'TimeoutError')
    return true
  })
  await assert.rejects(fetch('http://169.254.169.254/latest/meta-data/', { signal: AbortSignal.timeout(3000) }))
})

test('이름 풀기에서 사설 주소가 나오면 거절', async () => {
  assert.ok(await lookupOf('localhost'))
  assert.ok(await lookupOf('127.0.0.1'))
  assert.ok(await lookupOf('10.250.0.1'))
  assert.ok(await lookupOf('169.254.169.254'))
})

test('공인 이름은 통과', { skip: process.env.OFFLINE === '1' }, async () => {
  assert.equal(await lookupOf('one.one.one.one'), null)
})
