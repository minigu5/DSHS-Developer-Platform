// node --test deploy/naru/test/ — 서버 preload 의 순수 함수
'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { nextStartArgs } = require('../preload-lib.js')

test('공개 주소에서 호스트만 뽑아 -H·-p 443 을 붙인다(끝 / 나 경로가 있어도)', () => {
  assert.deepEqual(nextStartArgs('https://dshs2.dshs.dev'), ['-H', 'dshs2.dshs.dev', '-p', '443'])
  assert.deepEqual(nextStartArgs('https://dshs2.dshs.dev/'), ['-H', 'dshs2.dshs.dev', '-p', '443'])
  assert.deepEqual(nextStartArgs('https://dshs.dev/some/path'), ['-H', 'dshs.dev', '-p', '443'])
})

test('주소가 없거나 https 가 아니면 던진다(잘못된 주소로 켜지지 않게)', () => {
  assert.throws(() => nextStartArgs(undefined))
  assert.throws(() => nextStartArgs(''))
  assert.throws(() => nextStartArgs('http://dshs2.dshs.dev'))
  assert.throws(() => nextStartArgs('not a url'))
})

const { shouldRedirectToSite } = require('../preload-lib.js')

test('입구 키가 없거나 틀린 바깥 요청은 공개 주소로 돌려보낸다', () => {
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: undefined, remoteAddress: '10.250.0.1' }), true)
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: 'nope', remoteAddress: '10.250.0.1' }), true)
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: ['a', 'b'], remoteAddress: '10.250.0.1' }), true)
})

test('키가 맞거나, 서버 안(루프백)에서 온 요청이거나, 서버에 키가 없으면 그대로', () => {
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: 'k'.repeat(64), remoteAddress: '10.250.0.1' }), false)
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: undefined, remoteAddress: '127.0.0.1' }), false)
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: undefined, remoteAddress: '::ffff:127.0.0.1' }), false)
  assert.equal(shouldRedirectToSite({ relayKey: 'k'.repeat(64), headerKey: undefined, remoteAddress: '::1' }), false)
  assert.equal(shouldRedirectToSite({ relayKey: '', headerKey: undefined, remoteAddress: '10.250.0.1' }), false)
})
