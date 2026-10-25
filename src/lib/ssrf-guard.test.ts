import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ipAddressesOnly, isBlockedIp } from './ssrf-guard.ts'

// Cloudflare Workers 의 node:dns lookup 은 CNAME 대상 이름도 address 로 돌려준다(2026-10-25 실측: hwip.dshs.dev)
test('lookup 결과에 섞인 CNAME 이름은 버리고 IP 만 남긴다', () => {
  const results = [
    { address: 'ec9b28a1abbf2940.vercel-dns-017.com.' },
    { address: '64.29.17.1' },
    { address: '216.198.79.1' },
    { address: 'ec9b28a1abbf2940.vercel-dns-017.com.' },
  ]
  assert.deepEqual(ipAddressesOnly(results), ['64.29.17.1', '216.198.79.1'])
})

test('IPv6 는 남긴다', () => {
  assert.deepEqual(ipAddressesOnly([{ address: '2606:4700:3034::6815:2140' }]), ['2606:4700:3034::6815:2140'])
})

test('사설 IP 는 걸러내지 않고 그대로 넘겨 isBlockedIp 가 막게 한다', () => {
  const kept = ipAddressesOnly([{ address: 'a.example.com.' }, { address: '10.0.0.5' }])
  assert.deepEqual(kept, ['10.0.0.5'])
  assert.equal(isBlockedIp('10.0.0.5'), true)
})

test('IP 가 하나도 없으면 빈 배열', () => {
  assert.deepEqual(ipAddressesOnly([{ address: 'a.example.com.' }]), [])
})

test('isBlockedIp 는 IP 가 아닌 문자열을 여전히 막는다', () => {
  assert.equal(isBlockedIp('a.example.com.'), true)
})
