import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newStepId, seedSteps, titleOf } from './steps.ts'

test('titleOf: 첫 헤딩 기호를 떼고 제목만 돌려준다', () => {
  assert.equal(titleOf('## 폴더 열기\n본문'), '폴더 열기')
  assert.equal(titleOf('# A'), 'A')
  assert.equal(titleOf('본문만'), '본문만')
})

test('titleOf: 빈 본문은 기본 제목', () => {
  assert.equal(titleOf(''), '제목 없는 단계')
  assert.equal(titleOf('\n  \n'), '제목 없는 단계')
  assert.equal(titleOf('##'), '제목 없는 단계')
})

test('titleOf: 앞의 빈 줄은 건너뛴다', () => {
  assert.equal(titleOf('\n\n### 설치\n본문'), '설치')
})

test('seedSteps: id는 s1..sn', () => {
  assert.deepEqual(
    seedSteps(['a', 'b']).map((s) => s.id),
    ['s1', 's2'],
  )
  assert.deepEqual(seedSteps(['a'])[0], { id: 's1', body: 'a' })
})

test('newStepId: 8자 [a-z0-9]', () => {
  for (let i = 0; i < 50; i++) assert.match(newStepId(), /^[a-z0-9]{8}$/)
  assert.notEqual(newStepId(), newStepId())
})
