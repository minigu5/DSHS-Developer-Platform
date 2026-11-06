import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextPosterState, undoPosterState } from './store.ts'

const prev = { html: '<p>1</p>', art_url: 'u1', art_order: null, versions: [], messages: [] }

test('이전 상태가 버전으로, 메시지 둘 추가', () => {
  const n = nextPosterState(prev, { html: '<p>2</p>', artUrl: 'u2', artOrder: null, userText: '크게', modelText: '고쳤어요', now: 't' })
  assert.equal(n.html, '<p>2</p>')
  assert.deepEqual(n.versions[0], { html: '<p>1</p>', artUrl: 'u1', artOrder: null, at: 't' })
  assert.deepEqual(n.messages.map((m) => m.role), ['user', 'model'])
})

test('첫 생성(html null)은 버전을 만들지 않음', () => {
  assert.equal(nextPosterState({ ...prev, html: null }, { html: 'x', artUrl: null, artOrder: null, userText: '', modelText: '', now: 't' }).versions.length, 0)
})

test('빈 사용자 부탁은 메시지로 남기지 않음', () => {
  const n = nextPosterState({ ...prev, html: null }, { html: 'x', artUrl: null, artOrder: null, userText: '  ', modelText: '만들었어요', now: 't' })
  assert.deepEqual(n.messages.map((m) => m.role), ['model'])
})

test('버전 5개·메시지 10개까지만', () => {
  let s: ReturnType<typeof nextPosterState> = prev
  for (let i = 0; i < 8; i++) s = nextPosterState(s, { html: `<p>${i}</p>`, artUrl: null, artOrder: null, userText: 'u', modelText: 'm', now: String(i) })
  assert.equal(s.versions.length, 5)
  assert.equal(s.messages.length, 10)
})

test('되돌리기: 마지막 버전 복원, 없으면 null', () => {
  const n = nextPosterState(prev, { html: '<p>2</p>', artUrl: 'u2', artOrder: null, userText: '', modelText: '', now: 't' })
  const u = undoPosterState(n)!
  assert.equal(u.html, '<p>1</p>')
  assert.equal(u.art_url, 'u1')
  assert.equal(u.versions.length, 0)
  assert.equal(undoPosterState(prev), null)
})
