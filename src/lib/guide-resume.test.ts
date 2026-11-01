import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGuideResume, hasMoreToRead, type GuideResume } from './guide-resume.ts'

const ok: GuideResume = {
  path: '/guide/website/yes/claude/mac',
  title: '웹사이트 만들기',
  step: 4,
  total: 20,
  chapterNo: 2,
  chapterName: '만들고 돌려 보기',
  inChapter: 1,
  stepTitle: '처음 부탁하기',
  at: 1_790_000_000_000,
}

test('정상 기록은 그대로 읽힌다', () => {
  assert.deepEqual(parseGuideResume(JSON.stringify(ok)), ok)
})

test('없거나 JSON 이 아니면 null', () => {
  assert.equal(parseGuideResume(null), null)
  assert.equal(parseGuideResume(''), null)
  assert.equal(parseGuideResume('{'), null)
  assert.equal(parseGuideResume('3'), null)
})

test('가이드 경로가 아닌 주소는 받지 않는다', () => {
  for (const path of ['https://evil.example/guide/x', '//evil.example', '/guide', '/guide/', '/tips/1', '/guide/a?x=1', '/guide/../me']) {
    assert.equal(parseGuideResume(JSON.stringify({ ...ok, path })), null, path)
  }
})

test('단계 범위가 이상하면 null', () => {
  assert.equal(parseGuideResume(JSON.stringify({ ...ok, step: 20 })), null)
  assert.equal(parseGuideResume(JSON.stringify({ ...ok, step: -1 })), null)
  assert.equal(parseGuideResume(JSON.stringify({ ...ok, step: 1.5 })), null)
  assert.equal(parseGuideResume(JSON.stringify({ ...ok, total: 0, step: 0 })), null)
  assert.equal(parseGuideResume(JSON.stringify({ ...ok, title: 3 })), null)
})

test('마지막 단계면 더 읽을 게 없다', () => {
  assert.equal(hasMoreToRead(ok), true)
  assert.equal(hasMoreToRead({ ...ok, step: 19 }), false)
})
