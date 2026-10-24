import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EditInputSchema, RevertInputSchema, SyncInputSchema } from './schema.ts'

const valid = {
  key: 'dev-sample',
  baseRev: 2,
  title: '샘플 가이드',
  steps: [
    { id: 'a1', body: '## 첫 단계\n내용' },
    { id: 'b2', body: '둘째' },
  ],
  summary: '오타를 고쳤어요',
}

function reject(patch: Record<string, unknown>): string {
  const r = EditInputSchema.safeParse({ ...valid, ...patch })
  assert.equal(r.success, false)
  return r.success ? '' : (r.error.issues[0]?.message ?? '')
}

test('EditInputSchema: 정상 입력 통과, 제목·요약은 다듬어짐', () => {
  const r = EditInputSchema.safeParse({ ...valid, title: '  제목  ', summary: ' 요약 ' })
  assert.equal(r.success, true)
  if (r.success) {
    assert.equal(r.data.title, '제목')
    assert.equal(r.data.summary, '요약')
  }
})

test('EditInputSchema: baseRev 0 허용', () => {
  assert.equal(EditInputSchema.safeParse({ ...valid, baseRev: 0 }).success, true)
})

test('EditInputSchema: 단계 0개 거부', () => {
  reject({ steps: [] })
})

test('EditInputSchema: 단계 51개 거부', () => {
  reject({ steps: Array.from({ length: 51 }, (_, i) => ({ id: `s${i}`, body: 'x' })) })
})

test('EditInputSchema: 단계 50개 통과', () => {
  const steps = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, body: 'x' }))
  assert.equal(EditInputSchema.safeParse({ ...valid, steps }).success, true)
})

test('EditInputSchema: rejects blank body', () => {
  reject({ steps: [{ id: 'a1', body: '   ' }] })
})

test('EditInputSchema: body 20,001자 거부, 20,000자 통과', () => {
  reject({ steps: [{ id: 'a1', body: 'x'.repeat(20001) }] })
  assert.equal(
    EditInputSchema.safeParse({ ...valid, steps: [{ id: 'a1', body: 'x'.repeat(20000) }] }).success,
    true,
  )
})

test('EditInputSchema: steps JSON 200KB 초과 거부', () => {
  // 한글 3바이트 x 20,000자 = 60KB 단계 4개 = 240KB
  const steps = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}`, body: '가'.repeat(20000) }))
  reject({ steps })
})

test('EditInputSchema: summary 공백뿐 거부, 해요체 메시지', () => {
  assert.equal(reject({ summary: '  ' }), '무엇을 고쳤는지 한 줄로 적어 주세요.')
})

test('EditInputSchema: summary 101자 거부, 100자 통과', () => {
  reject({ summary: 'x'.repeat(101) })
  assert.equal(EditInputSchema.safeParse({ ...valid, summary: 'x'.repeat(100) }).success, true)
})

test('EditInputSchema: 중복 id 거부', () => {
  reject({ steps: [{ id: 'a1', body: 'x' }, { id: 'a1', body: 'y' }] })
})

test('EditInputSchema: 잘못된 단계 id 거부', () => {
  reject({ steps: [{ id: 'Bad_Id', body: 'x' }] })
  reject({ steps: [{ id: '', body: 'x' }] })
  reject({ steps: [{ id: 'a'.repeat(17), body: 'x' }] })
})

test('EditInputSchema: key Bad_Key 거부', () => {
  reject({ key: 'Bad_Key' })
  reject({ key: '-lead' })
  reject({ key: 'a'.repeat(101) })
})

test('EditInputSchema: baseRev 음수·소수 거부', () => {
  reject({ baseRev: -1 })
  reject({ baseRev: 1.5 })
})

test('EditInputSchema: 제목 공백뿐·121자 거부', () => {
  reject({ title: '   ' })
  reject({ title: 'x'.repeat(121) })
})

test('RevertInputSchema: 정상 통과, 이유 다듬기', () => {
  const r = RevertInputSchema.safeParse({ key: 'dev-sample', targetRev: 1, baseRev: 3, reason: ' 잘못 고쳤어요 ' })
  assert.equal(r.success, true)
  if (r.success) assert.equal(r.data.reason, '잘못 고쳤어요')
})

test('RevertInputSchema: targetRev 0·baseRev 0·이유 공백·101자 거부', () => {
  const base = { key: 'dev-sample', targetRev: 1, baseRev: 3, reason: '이유' }
  assert.equal(RevertInputSchema.safeParse({ ...base, targetRev: 0 }).success, false)
  assert.equal(RevertInputSchema.safeParse({ ...base, baseRev: 0 }).success, false)
  assert.equal(RevertInputSchema.safeParse({ ...base, reason: '  ' }).success, false)
  assert.equal(RevertInputSchema.safeParse({ ...base, reason: 'x'.repeat(101) }).success, false)
})

test('SyncInputSchema: baseRev 1 이상만', () => {
  assert.equal(SyncInputSchema.safeParse({ key: 'dev-sample', baseRev: 1 }).success, true)
  assert.equal(SyncInputSchema.safeParse({ key: 'dev-sample', baseRev: 0 }).success, false)
  assert.equal(SyncInputSchema.safeParse({ key: 'Bad_Key', baseRev: 1 }).success, false)
})
