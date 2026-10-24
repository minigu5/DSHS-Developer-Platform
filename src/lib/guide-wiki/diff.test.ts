import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeStats, describeStats, diffSteps, revertedBy } from './diff.ts'
import type { WikiStep } from './types.ts'

const s = (id: string, body: string): WikiStep => ({ id, body })

test('computeStats: 추가·삭제·수정', () => {
  const before = [s('a', 'a'), s('b', 'b'), s('c', 'c'), s('d', 'd')]
  const after = [s('a', 'a'), s('b', 'b2'), s('n', 'new'), s('d', 'd')]
  const st = computeStats(before, after)
  assert.equal(st.added, 1)
  assert.equal(st.removed, 1)
  assert.equal(st.edited, 1)
  assert.equal(st.moved, 0)
})

test('computeStats: 순서만 바뀌면 moved', () => {
  const before = [s('a', 'a'), s('b', 'b'), s('c', 'c')]
  const after = [s('c', 'c'), s('a', 'a'), s('b', 'b')]
  const st = computeStats(before, after)
  assert.ok(st.moved >= 1)
  assert.equal(st.added + st.removed + st.edited, 0)
})

test('computeStats: 동일 입력은 전부 0', () => {
  const steps = [s('a', 'x\ny'), s('b', 'z')]
  assert.deepEqual(computeStats(steps, steps), {
    added: 0,
    removed: 0,
    edited: 0,
    moved: 0,
    plus: 0,
    minus: 0,
  })
})

test('computeStats: plus/minus는 코드 포인트 단위', () => {
  const st = computeStats([s('a', '가')], [s('a', '가😀')])
  assert.equal(st.plus, 1)
  assert.equal(st.minus, 0)
})

test('computeStats: 추가·삭제 단계 본문 전체가 plus/minus에 들어간다', () => {
  const st = computeStats([s('a', '가나')], [s('b', '😀')])
  assert.equal(st.plus, 1)
  assert.equal(st.minus, 2)
})

test('diffSteps: 수정 단계는 줄 단위 del/add', () => {
  const d = diffSteps(
    [s('a', '## 제목\nmkdir a\n끝')],
    [s('a', '## 제목\nmkdir b\n끝')],
  )
  assert.equal(d.length, 1)
  assert.equal(d[0].kind, 'edited')
  assert.equal(d[0].title, '제목')
  assert.deepEqual(d[0].lines, [
    { op: 'same', text: '## 제목' },
    { op: 'del', text: 'mkdir a' },
    { op: 'add', text: 'mkdir b' },
    { op: 'same', text: '끝' },
  ])
})

test('diffSteps: 추가 단계는 모든 줄이 add', () => {
  const d = diffSteps([], [s('n', '## 새\n줄')])
  assert.equal(d[0].kind, 'added')
  assert.equal(d[0].fromIndex, null)
  assert.equal(d[0].toIndex, 0)
  assert.deepEqual(d[0].lines, [
    { op: 'add', text: '## 새' },
    { op: 'add', text: '줄' },
  ])
})

test('diffSteps: 삭제 단계는 removed, toIndex null', () => {
  const d = diffSteps([s('a', 'x'), s('b', 'y')], [s('a', 'x')])
  assert.deepEqual(
    d.map((x) => [x.id, x.kind]),
    [
      ['a', 'same'],
      ['b', 'removed'],
    ],
  )
  assert.equal(d[1].toIndex, null)
  assert.equal(d[1].fromIndex, 1)
  assert.deepEqual(d[1].lines, [{ op: 'del', text: 'y' }])
})

test('diffSteps: 순서만 바뀐 단계는 same + moved', () => {
  const d = diffSteps(
    [s('a', 'a'), s('b', 'b'), s('c', 'c')],
    [s('c', 'c'), s('a', 'a'), s('b', 'b')],
  )
  assert.deepEqual(
    d.map((x) => x.id),
    ['c', 'a', 'b'],
  )
  assert.equal(d[0].kind, 'same')
  assert.equal(d[0].moved, true)
  assert.equal(d[1].moved, false)
  assert.equal(d[2].moved, false)
})

test('diffSteps: 삭제 단계는 원래 앞 단계 뒤에 끼워 넣는다', () => {
  const d = diffSteps(
    [s('a', 'a'), s('b', 'b'), s('c', 'c')],
    [s('a', 'a'), s('c', 'c')],
  )
  assert.deepEqual(
    d.map((x) => x.id),
    ['a', 'b', 'c'],
  )
})

test('revertedBy: 되돌리기는 사이 버전을 무효로 만든다', () => {
  const revs = [1, 2, 3, 4, 5].map((n) => ({
    revNo: n,
    kind: 'edit',
    revertOf: null as number | null,
  }))
  revs.push({ revNo: 6, kind: 'revert', revertOf: 2 })
  const m = revertedBy(revs)
  assert.deepEqual(
    [...m.entries()].sort((x, y) => x[0] - y[0]),
    [
      [3, 6],
      [4, 6],
      [5, 6],
    ],
  )
  assert.equal(m.has(2), false)
  assert.equal(m.has(6), false)
})

test('revertedBy: 가장 나중 되돌리기가 이긴다', () => {
  const revs = [1, 2, 3, 4, 5].map((n) => ({
    revNo: n,
    kind: 'edit',
    revertOf: null as number | null,
  }))
  revs.push({ revNo: 6, kind: 'revert', revertOf: 2 })
  revs.push({ revNo: 7, kind: 'revert', revertOf: 4 })
  const m = revertedBy(revs)
  assert.equal(m.get(3), 6)
  assert.equal(m.get(4), 6)
  assert.equal(m.get(5), 7)
  assert.equal(m.get(6), 7)
  assert.equal(m.has(7), false)
})

test('revertedBy: revert가 아닌 버전은 무효화하지 않는다', () => {
  const m = revertedBy([
    { revNo: 1, kind: 'seed', revertOf: null },
    { revNo: 2, kind: 'edit', revertOf: 1 },
    { revNo: 3, kind: 'sync', revertOf: 1 },
  ])
  assert.equal(m.size, 0)
})

test('describeStats', () => {
  const base = { plus: 0, minus: 0 }
  assert.equal(
    describeStats({ added: 1, removed: 1, edited: 2, moved: 1, ...base }),
    '단계 1개 추가 · 1개 삭제 · 2개 수정 · 순서 바뀜',
  )
  assert.equal(
    describeStats({ added: 0, removed: 0, edited: 3, moved: 0, ...base }),
    '단계 3개 수정',
  )
  assert.equal(
    describeStats({ added: 0, removed: 0, edited: 0, moved: 2, ...base }),
    '순서 바뀜',
  )
  assert.equal(
    describeStats({ added: 0, removed: 0, edited: 0, moved: 0, ...base }),
    '',
  )
})
