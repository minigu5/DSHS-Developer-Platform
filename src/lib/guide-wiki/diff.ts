import { diffArrays, diffLines } from 'diff'
import { titleOf } from './steps.ts'
import type { RevisionStats, WikiStep } from './types.ts'

export type LineDiff = { op: 'same' | 'add' | 'del'; text: string }

export type StepDiff = {
  kind: 'same' | 'edited' | 'added' | 'removed'
  id: string
  title: string
  fromIndex: number | null
  toIndex: number | null
  moved: boolean
  lines: LineDiff[]
}

// 글자 단위 diff가 너무 오래 걸리면(통째로 갈아엎은 경우) 줄 전체를 세는 쪽으로 물러난다.
const CHAR_DIFF_MAX_EDIT = 2000

function codePoints(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i += text.codePointAt(i)! > 0xffff ? 2 : 1) n++
  return n
}

function splitLines(value: string): string[] {
  if (value === '') return []
  const parts = value.split('\n')
  if (parts[parts.length - 1] === '') parts.pop()
  return parts
}

function lineChunks(a: string, b: string) {
  return diffLines(a, b, { ignoreNewlineAtEof: true })
}

function lineDiffOf(a: string, b: string): LineDiff[] {
  const out: LineDiff[] = []
  for (const chunk of lineChunks(a, b)) {
    const op = chunk.added ? 'add' : chunk.removed ? 'del' : 'same'
    for (const text of splitLines(chunk.value)) out.push({ op, text })
  }
  return out
}

/** 한 단계의 변경 규모(코드 포인트). 줄이 바뀐 곳은 글자 단위로 다시 비교한다. */
function countChange(a: string, b: string): { plus: number; minus: number } {
  if (a === b) return { plus: 0, minus: 0 }
  let plus = 0
  let minus = 0
  let removed = ''
  let added = ''
  const flush = () => {
    if (removed !== '' && added !== '') {
      const parts = diffArrays(Array.from(removed), Array.from(added), {
        maxEditLength: CHAR_DIFF_MAX_EDIT,
      })
      if (parts === undefined) {
        minus += codePoints(removed)
        plus += codePoints(added)
      } else {
        for (const p of parts) {
          if (p.added) plus += p.value.length
          else if (p.removed) minus += p.value.length
        }
      }
    } else {
      minus += codePoints(removed)
      plus += codePoints(added)
    }
    removed = ''
    added = ''
  }
  for (const chunk of lineChunks(a, b)) {
    if (chunk.added) added += chunk.value
    else if (chunk.removed) removed += chunk.value
    else flush()
  }
  flush()
  return { plus, minus }
}

/** 양쪽에 다 있는 id 중, 상대 순서의 최장 증가 부분수열 밖에 있는 것 = 옮겨진 단계. */
function movedIds(before: WikiStep[], after: WikiStep[]): Set<string> {
  const beforeIndex = new Map<string, number>()
  before.forEach((st, i) => beforeIndex.set(st.id, i))
  const common: { id: string; from: number }[] = []
  for (const st of after) {
    const from = beforeIndex.get(st.id)
    if (from !== undefined) common.push({ id: st.id, from })
  }
  // patience sorting LIS (strictly increasing), O(n log n)
  const tails: number[] = [] // tails[k] = common 인덱스 중 길이 k+1 증가열의 마지막
  const prev: number[] = new Array(common.length).fill(-1)
  for (let i = 0; i < common.length; i++) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (common[tails[mid]].from < common[i].from) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[i] = tails[lo - 1]
    tails[lo] = i
  }
  const keep = new Set<number>()
  let k = tails.length > 0 ? tails[tails.length - 1] : -1
  while (k !== -1) {
    keep.add(k)
    k = prev[k]
  }
  const moved = new Set<string>()
  common.forEach((c, i) => {
    if (!keep.has(i)) moved.add(c.id)
  })
  return moved
}

export function computeStats(
  before: WikiStep[],
  after: WikiStep[],
): RevisionStats {
  const beforeById = new Map(before.map((st) => [st.id, st]))
  const afterIds = new Set(after.map((st) => st.id))
  let added = 0
  let removed = 0
  let edited = 0
  let plus = 0
  let minus = 0
  for (const st of after) {
    const old = beforeById.get(st.id)
    if (old === undefined) {
      added++
      plus += codePoints(st.body)
    } else if (old.body !== st.body) {
      edited++
      const c = countChange(old.body, st.body)
      plus += c.plus
      minus += c.minus
    }
  }
  for (const st of before) {
    if (!afterIds.has(st.id)) {
      removed++
      minus += codePoints(st.body)
    }
  }
  return {
    added,
    removed,
    edited,
    moved: movedIds(before, after).size,
    plus,
    minus,
  }
}

export function diffSteps(before: WikiStep[], after: WikiStep[]): StepDiff[] {
  const beforeIndex = new Map<string, number>()
  before.forEach((st, i) => beforeIndex.set(st.id, i))
  const afterIds = new Set(after.map((st) => st.id))
  const moved = movedIds(before, after)

  // 삭제된 단계는 원래 바로 앞에 있던(살아남은) 단계 뒤에 붙인다. 없으면 맨 앞.
  const removedAfter = new Map<string | null, StepDiff[]>()
  let anchor: string | null = null
  before.forEach((st, i) => {
    if (afterIds.has(st.id)) {
      anchor = st.id
      return
    }
    const entry: StepDiff = {
      kind: 'removed',
      id: st.id,
      title: titleOf(st.body),
      fromIndex: i,
      toIndex: null,
      moved: false,
      lines: lineDiffOf(st.body, ''),
    }
    const list = removedAfter.get(anchor)
    if (list) list.push(entry)
    else removedAfter.set(anchor, [entry])
  })

  const out: StepDiff[] = [...(removedAfter.get(null) ?? [])]
  after.forEach((st, toIndex) => {
    const fromIndex = beforeIndex.get(st.id)
    if (fromIndex === undefined) {
      out.push({
        kind: 'added',
        id: st.id,
        title: titleOf(st.body),
        fromIndex: null,
        toIndex,
        moved: false,
        lines: lineDiffOf('', st.body),
      })
    } else {
      const old = before[fromIndex]
      out.push({
        kind: old.body === st.body ? 'same' : 'edited',
        id: st.id,
        title: titleOf(st.body),
        fromIndex,
        toIndex,
        moved: moved.has(st.id),
        lines: lineDiffOf(old.body, st.body),
      })
    }
    out.push(...(removedAfter.get(st.id) ?? []))
  })
  return out
}

/**
 * revNo -> 그 버전을 무효로 만든 가장 나중 revert의 revNo.
 * revertOf K인 revert R은 K+1..R-1을 무효로 만든다. kind가 'revert'인 것만 해당.
 */
export function revertedBy(
  revs: { revNo: number; kind: string; revertOf: number | null }[],
): Map<number, number> {
  const map = new Map<number, number>()
  const reverts = revs
    .filter((r) => r.kind === 'revert' && r.revertOf !== null)
    .sort((a, b) => a.revNo - b.revNo)
  for (const r of reverts) {
    const target = r.revertOf as number
    for (let n = target + 1; n < r.revNo; n++) map.set(n, r.revNo)
  }
  return map
}

export function describeStats(s: RevisionStats): string {
  const counts: string[] = []
  if (s.added > 0) counts.push(`${s.added}개 추가`)
  if (s.removed > 0) counts.push(`${s.removed}개 삭제`)
  if (s.edited > 0) counts.push(`${s.edited}개 수정`)
  const parts: string[] = []
  if (counts.length > 0) {
    counts[0] = `단계 ${counts[0]}`
    parts.push(...counts)
  }
  if (s.moved > 0) parts.push('순서 바뀜')
  return parts.join(' · ')
}
