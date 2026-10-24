import { test } from 'node:test'
import assert from 'node:assert/strict'
import { editorReducer, initEditorState, liveSteps, type EditorState } from './reducer.ts'
import type { WikiStep } from '../../../lib/guide-wiki/types.ts'

const ORIGINAL: WikiStep[] = [
  { id: 's1', body: '## 하나\n\n첫째' },
  { id: 's2', body: '## 둘\n\n둘째' },
  { id: 's3', body: '## 셋\n\n셋째' },
]

function start(): EditorState {
  return initEditorState(ORIGINAL)
}

function ids(state: EditorState): string[] {
  return state.steps.map((s) => s.id)
}

test('initEditorState: 원본을 그대로, 모두 살아 있고 나란히 모드', () => {
  const s = start()
  assert.deepEqual(s.original, ORIGINAL)
  assert.deepEqual(ids(s), ['s1', 's2', 's3'])
  assert.ok(s.steps.every((st) => st.gone === false))
  assert.equal(s.openId, null)
  assert.equal(s.mode, 'split')
  assert.equal(s.whole, false)
  assert.equal(s.summary, '')
})

test('insert at 0: 새 단계가 맨 앞, 펼쳐지고 본문은 새 단계 헤딩', () => {
  const s = editorReducer(start(), { type: 'insert', at: 0 })
  assert.equal(s.steps.length, 4)
  const first = s.steps[0]
  assert.match(first.id, /^[a-z0-9]{8}$/)
  assert.equal(first.body, '## 새 단계\n\n')
  assert.equal(first.gone, false)
  assert.equal(s.openId, first.id)
  assert.deepEqual(ids(s).slice(1), ['s1', 's2', 's3'])
})

test('insert: 가운데·끝에도 넣는다', () => {
  const mid = editorReducer(start(), { type: 'insert', at: 2 })
  assert.deepEqual(ids(mid).filter((id) => id !== mid.openId), ['s1', 's2', 's3'])
  assert.equal(mid.steps[2].id, mid.openId)
  const end = editorReducer(start(), { type: 'insert', at: 3 })
  assert.equal(end.steps[3].id, end.openId)
})

test('insert: 미리보기 모드였으면 작성 칸이 보이게 나란히로 바꾼다', () => {
  const preview = editorReducer(start(), { type: 'mode', mode: 'preview' })
  assert.equal(editorReducer(preview, { type: 'insert', at: 0 }).mode, 'split')
  const write = editorReducer(start(), { type: 'mode', mode: 'write' })
  assert.equal(editorReducer(write, { type: 'insert', at: 0 }).mode, 'write')
})

test('remove: 원본 단계는 gone 으로 자리에 남고 restore 로 복구', () => {
  const removed = editorReducer(start(), { type: 'remove', id: 's2' })
  assert.deepEqual(ids(removed), ['s1', 's2', 's3'])
  assert.equal(removed.steps[1].gone, true)
  assert.deepEqual(
    liveSteps(removed).map((s) => s.id),
    ['s1', 's3'],
  )
  const restored = editorReducer(removed, { type: 'restore', id: 's2' })
  assert.equal(restored.steps[1].gone, false)
  assert.deepEqual(liveSteps(restored), ORIGINAL)
})

test('remove: 펼쳐 둔 단계를 지우면 접힌다', () => {
  const open = editorReducer(start(), { type: 'toggle', id: 's2' })
  const removed = editorReducer(open, { type: 'remove', id: 's2' })
  assert.equal(removed.openId, null)
  const other = editorReducer(open, { type: 'remove', id: 's1' })
  assert.equal(other.openId, 's2')
})

test('remove: 새 단계는 배열에서 사라진다', () => {
  const inserted = editorReducer(start(), { type: 'insert', at: 1 })
  const newId = inserted.steps[1].id
  const removed = editorReducer(inserted, { type: 'remove', id: newId })
  assert.deepEqual(ids(removed), ['s1', 's2', 's3'])
  assert.equal(removed.openId, null)
})

test('remove: 살아 있는 단계가 1개면 무시', () => {
  let s = editorReducer(start(), { type: 'remove', id: 's1' })
  s = editorReducer(s, { type: 'remove', id: 's2' })
  assert.equal(liveSteps(s).length, 1)
  const after = editorReducer(s, { type: 'remove', id: 's3' })
  assert.equal(after, s)
  assert.equal(after.steps[2].gone, false)
})

test('move: 살아 있는 이웃과 자리를 바꾼다', () => {
  const down = editorReducer(start(), { type: 'move', id: 's1', dir: 1 })
  assert.deepEqual(ids(down), ['s2', 's1', 's3'])
  const up = editorReducer(start(), { type: 'move', id: 's3', dir: -1 })
  assert.deepEqual(ids(up), ['s1', 's3', 's2'])
})

test('move: gone 단계를 건너뛰고 그 자리는 그대로 둔다', () => {
  const removed = editorReducer(start(), { type: 'remove', id: 's2' })
  const moved = editorReducer(removed, { type: 'move', id: 's1', dir: 1 })
  assert.deepEqual(ids(moved), ['s3', 's2', 's1'])
  assert.equal(moved.steps[1].gone, true)
  assert.deepEqual(
    liveSteps(moved).map((s) => s.id),
    ['s3', 's1'],
  )
})

test('move: 끝에서는 무시, gone 단계 이동도 무시', () => {
  const s = start()
  assert.equal(editorReducer(s, { type: 'move', id: 's1', dir: -1 }), s)
  assert.equal(editorReducer(s, { type: 'move', id: 's3', dir: 1 }), s)
  const removed = editorReducer(s, { type: 'remove', id: 's3' })
  // s3 가 지워졌으니 s2 가 살아 있는 마지막
  assert.equal(editorReducer(removed, { type: 'move', id: 's2', dir: 1 }), removed)
  assert.equal(editorReducer(removed, { type: 'move', id: 's3', dir: -1 }), removed)
})

test('toggle: 하나만 펼치고, 같은 id 면 닫힌다', () => {
  const a = editorReducer(start(), { type: 'toggle', id: 's1' })
  assert.equal(a.openId, 's1')
  const b = editorReducer(a, { type: 'toggle', id: 's2' })
  assert.equal(b.openId, 's2')
  const c = editorReducer(b, { type: 'toggle', id: 's2' })
  assert.equal(c.openId, null)
})

test('edit: 그 단계 본문만 바꾼다', () => {
  const s = editorReducer(start(), { type: 'edit', id: 's2', body: '## 둘\n\n고침' })
  assert.equal(s.steps[1].body, '## 둘\n\n고침')
  assert.equal(s.steps[0].body, ORIGINAL[0].body)
  assert.deepEqual(s.original, ORIGINAL)
})

test('mode · whole · summary', () => {
  let s = editorReducer(start(), { type: 'mode', mode: 'write' })
  assert.equal(s.mode, 'write')
  s = editorReducer(s, { type: 'whole' })
  assert.equal(s.whole, true)
  s = editorReducer(s, { type: 'whole' })
  assert.equal(s.whole, false)
  s = editorReducer(s, { type: 'summary', text: '팁 추가' })
  assert.equal(s.summary, '팁 추가')
})

test('liveSteps: gone 을 빼고 id·body 만 돌려준다', () => {
  const s = editorReducer(start(), { type: 'remove', id: 's1' })
  const live = liveSteps(s)
  assert.deepEqual(live, [ORIGINAL[1], ORIGINAL[2]])
  assert.deepEqual(Object.keys(live[0]).sort(), ['body', 'id'])
})
