import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRepoMeta, withRepoContext } from './repo-context.ts'

const info = { id: 'p1', title: '대곽나루', summary: '짧은 소개 — 설명 앞부분', types: ['website'], platforms: ['web'], url: null }

test('저장소 API 응답에서 설명·토픽(8개까지)·주 언어만', () => {
  const meta = parseRepoMeta({ description: ' GPU 서버 대여 ', topics: Array.from({ length: 10 }, (_, i) => `t${i}`), language: 'TypeScript', private: false })
  assert.deepEqual(meta, { description: 'GPU 서버 대여', topics: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'], language: 'TypeScript' })
  assert.deepEqual(parseRepoMeta({}), { description: null, topics: [], language: null })
})

test('README가 있으면 한 줄 소개 + README 요약(3000자)으로 소개를 바꾸고 저장소 정보를 붙임', () => {
  const out = withRepoContext(info, '짧은 소개', { meta: { description: 'GPU 서버 대여', topics: ['gpu'], language: 'Python' }, readme: '# 대곽나루\n' + '가'.repeat(5000) })
  assert.ok(out.summary.startsWith('짧은 소개 — 대곽나루 '))
  assert.ok(out.summary.length <= '짧은 소개 — '.length + 3000)
  assert.deepEqual(out.repo, { description: 'GPU 서버 대여', topics: ['gpu'], language: 'Python' })
})

test('README가 없으면 소개는 그대로, 저장소 정보만', () => {
  const out = withRepoContext(info, '짧은 소개', { meta: { description: null, topics: [], language: 'Go' }, readme: null })
  assert.equal(out.summary, info.summary)
  assert.equal(out.repo?.language, 'Go')
})

test('가져온 게 없으면 그대로', () => {
  assert.deepEqual(withRepoContext(info, '짧은 소개', null), info)
})
