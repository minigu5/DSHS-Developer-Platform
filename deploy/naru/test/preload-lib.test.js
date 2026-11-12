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
