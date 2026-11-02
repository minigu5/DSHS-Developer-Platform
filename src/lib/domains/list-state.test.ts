import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naruGuideKind, rowDisabled } from './list-state.ts'

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

test('naruGuideKind: ?naru= 없이는 안내 없음', () => {
  assert.equal(naruGuideKind({ naruServerId: null, rowCount: 3, candidates: 0, used: 3, max: 3 }), 'none')
})

test('naruGuideKind: 웹사이트 프로젝트가 하나도 없으면 먼저 등록', () => {
  assert.equal(naruGuideKind({ naruServerId: 'fa4e0001', rowCount: 0, candidates: 0, used: 0, max: 3 }), 'no-project')
})

test('naruGuideKind: 주소를 이미 3개 쓰고 있으면 새 프로젝트 등록이 아니라 한도 안내', () => {
  assert.equal(naruGuideKind({ naruServerId: 'fa4e0001', rowCount: 3, candidates: 0, used: 3, max: 3 }), 'limit')
  assert.equal(naruGuideKind({ naruServerId: 'fa4e0001', rowCount: 5, candidates: 0, used: 3, max: 3 }), 'limit')
})

test('naruGuideKind: 한도 안인데 고를 프로젝트가 없으면 새 프로젝트 등록', () => {
  assert.equal(naruGuideKind({ naruServerId: 'fa4e0001', rowCount: 2, candidates: 0, used: 2, max: 3 }), 'new-project')
})

test('naruGuideKind: 고를 프로젝트가 있으면 고르게 안내', () => {
  assert.equal(naruGuideKind({ naruServerId: 'fa4e0001', rowCount: 2, candidates: 1, used: 1, max: 3 }), 'pick')
})
