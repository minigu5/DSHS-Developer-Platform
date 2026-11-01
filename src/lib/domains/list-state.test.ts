import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rowDisabled } from './list-state.ts'

test('rowDisabled: 방문 주소도 대곽나루 서버도 없고 주소도 없으면 닫힘', () => {
  assert.equal(rowDisabled({ url: null, naruServerId: null, live: false }), true)
  assert.equal(rowDisabled({ url: '', naruServerId: undefined, live: false }), true)
})

test('rowDisabled: 방문 주소나 대곽나루 흐름이면 열림', () => {
  assert.equal(rowDisabled({ url: 'https://a.example', naruServerId: null, live: false }), false)
  assert.equal(rowDisabled({ url: null, naruServerId: 'fa4e0001', live: false }), false)
})

test('rowDisabled: 이미 주소가 살아 있으면 방문 주소가 없어도 관리할 수 있다', () => {
  assert.equal(rowDisabled({ url: null, naruServerId: null, live: true }), false)
})
