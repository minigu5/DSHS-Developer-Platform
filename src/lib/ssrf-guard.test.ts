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

test('IPv6 안에 넣은 IPv4(16진 표기 포함)도 사설이면 막는다 — URL 이 [::ffff:127.0.0.1] 을 [::ffff:7f00:1] 로 바꿔 씀', () => {
  assert.equal(isBlockedIp('::ffff:7f00:1'), true)
  assert.equal(isBlockedIp('::ffff:127.0.0.1'), true)
  assert.equal(isBlockedIp('::ffff:afa:1'), true) // 10.250.0.1
  assert.equal(isBlockedIp('0:0:0:0:0:ffff:7f00:1'), true)
  assert.equal(isBlockedIp('::7f00:1'), true) // IPv4-compatible
  assert.equal(isBlockedIp('64:ff9b::7f00:1'), true) // NAT64
  assert.equal(isBlockedIp('::ffff:808:808'), false) // 8.8.8.8
  assert.equal(isBlockedIp('2606:4700:4700::1111'), false)
})

test('IPv6 사설·특수 대역을 비트로 판정 — fe80::/10 전체, fec0::/10, 6to4·Teredo·NAT64 지역 대역', () => {
  assert.equal(isBlockedIp('fe90::1'), true) // fe80::/10 안
  assert.equal(isBlockedIp('febf::1'), true)
  assert.equal(isBlockedIp('fec0::1'), true) // site-local(옛)
  assert.equal(isBlockedIp('64:ff9b:1::7f00:1'), true) // 지역 NAT64
  assert.equal(isBlockedIp('::ffff:0:7f00:1'), true) // SIIT
  assert.equal(isBlockedIp('2002:7f00:1::1'), true) // 6to4
  assert.equal(isBlockedIp('2001:0:4136:e378::1'), true) // Teredo
  assert.equal(isBlockedIp('2001:db8::1'), true) // 문서용
  assert.equal(isBlockedIp('100::1'), true) // discard
  assert.equal(isBlockedIp('2606:4700:4700::1111'), false)
  assert.equal(isBlockedIp('2404:6800:4004:80a::200e'), false)
})
