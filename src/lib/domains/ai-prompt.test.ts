import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildVerifyPrompt } from './ai-prompt.ts'

const TOKEN = 'abc123token'

test('주소·확인 코드·호스트 이름이 들어간다', () => {
  const p = buildVerifyPrompt({ name: 'hwip', token: TOKEN, host: 'vercel' })
  assert.match(p, /^내 웹사이트의 도메인을 https:\/\/dshs\.dev 서비스를 이용해서 hwip\.dshs\.dev 로 변경했어\./)
  assert.ok(p.includes(`<meta name="dshs-verify" content="${TOKEN}">`))
  assert.ok(p.includes(`other: { "dshs-verify": "${TOKEN}" }`))
  assert.ok(p.includes('GitHub에 푸시해서 Vercel에 다시 배포되게 해 줘.'))
  assert.ok(p.includes('https://hwip.dshs.dev 의 "페이지 소스 보기"'))
})

test('GitLab Pages 는 GitHub 가 아니라 GitLab 에 푸시하라고 한다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: TOKEN, host: 'gitlab-pages' })
  assert.ok(p.includes('GitLab에 푸시해서 GitLab Pages에 다시 배포되게 해 줘.'))
})

test('호스트를 아직 모르면 "호스트"로 쓴다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: TOKEN, host: null })
  assert.ok(p.includes('GitHub에 푸시해서 호스트에 다시 배포되게 해 줘.'))
})

test('자바스크립트로 붙이면 안 된다는 조건이 들어 있다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: TOKEN, host: 'netlify' })
  assert.ok(p.includes('자바스크립트로 나중에 붙이면 안 돼.'))
})
