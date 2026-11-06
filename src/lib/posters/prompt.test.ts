import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPosterContents, summarizeDescription } from './prompt.ts'

const info = { id: 'p1', title: '대곽나루', summary: '학교 컴퓨터를 빌려 줘요', types: ['website'], platforms: ['web'], url: 'https://naru.dshs.dev' }

test('첫 생성: 프로젝트 정보 + 부탁, HTML 없음', () => {
  const c = buildPosterContents({ info, currentHtml: null, recent: [], request: '고래를 크게' })
  assert.equal(c.length, 1)
  assert.match(c[0].parts[0].text, /대곽나루/)
  assert.match(c[0].parts[0].text, /고래를 크게/)
  assert.doesNotMatch(c[0].parts[0].text, /naru\.dshs\.dev/)
})

test('고치기: 현재 HTML과 최근 사용자 부탁 4개만', () => {
  const recent = Array.from({ length: 6 }, (_, i) => ({ role: 'user' as const, text: `부탁${i}`, at: '' }))
  const t = buildPosterContents({ info, currentHtml: '<p>현재</p>', recent, request: '제목 크게' }).map((x) => x.parts[0].text).join('\n')
  assert.match(t, /<p>현재<\/p>/)
  assert.doesNotMatch(t, /부탁0|부탁1/)
  assert.match(t, /부탁2/)
  assert.match(t, /제목 크게/)
})

test('summarizeDescription: 링크·마크다운 기호 제거, 길이 제한', () => {
  assert.equal(summarizeDescription('# 제목\n[여기](https://x.y) **굵게**'), '제목 여기 굵게')
  assert.equal(summarizeDescription('가'.repeat(2000)).length, 1200)
})
