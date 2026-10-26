import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildVerifyPrompt } from './ai-prompt.ts'

const TOKEN = 'abc123token'

test('주소·확인 코드·호스트 이름이 들어간다', () => {
  const p = buildVerifyPrompt({ name: 'hwip', token: TOKEN, host: 'vercel', siteUrl: 'https://hwip.vercel.app/' })
  const [first, second] = p.split('\n')
  assert.equal(first, '내 웹사이트(https://hwip.vercel.app/)에 https://dshs.dev 서비스로 hwip.dshs.dev 주소를 붙이려고 해.')
  assert.equal(second, '먼저 이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘.')
  assert.ok(p.includes(`<meta name="dshs-verify" content="${TOKEN}">`))
  assert.ok(p.includes(`other: { "dshs-verify": "${TOKEN}" }`))
  assert.ok(p.includes('GitHub에 푸시해서 Vercel에 다시 배포되게 해 줘.'))
  assert.ok(p.includes('https://hwip.vercel.app/ 의 "페이지 소스 보기"'))
  assert.ok(!p.includes('로 변경했어'))
})

test('GitLab Pages 는 GitHub 가 아니라 GitLab 에 푸시하라고 한다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: TOKEN, host: 'gitlab-pages', siteUrl: 'https://me.gitlab.io/meal/' })
  assert.ok(p.includes('GitLab에 푸시해서 GitLab Pages에 다시 배포되게 해 줘.'))
})

test('호스트를 아직 모르면 "호스트"로 쓴다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: TOKEN, host: null, siteUrl: 'https://meal.vercel.app/' })
  assert.ok(p.includes('GitHub에 푸시해서 호스트에 다시 배포되게 해 줘.'))
})

test('자바스크립트로 붙이면 안 된다는 조건이 들어 있다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: TOKEN, host: 'netlify', siteUrl: 'https://meal.netlify.app/' })
  assert.ok(p.includes('자바스크립트로 나중에 붙이면 안 돼.'))
})

test('바로가기(Workers)는 받은 주소를 바로가기라고 하고 보낼 곳에서 확인하게 한다', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: 't0k', host: 'cloudflare-workers', siteUrl: 'https://meal.acct.workers.dev/' })
  assert.equal(p.split('\n')[0], '내 웹사이트(https://meal.acct.workers.dev/)에 https://dshs.dev 서비스로 meal.dshs.dev 바로가기 주소를 붙이려고 해.')
  assert.equal(p.split('\n')[1], '먼저 이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘.')
  assert.ok(p.includes('https://meal.acct.workers.dev'))
  assert.ok(p.includes('<meta name="dshs-verify" content="t0k">'))
  assert.ok(p.includes('wrangler deploy'))
  assert.ok(!p.includes('로 변경했어'))
})

test('바로가기(Firebase)는 firebase deploy 와 public/index.html', () => {
  const p = buildVerifyPrompt({ name: 'meal', token: 't0k', host: 'firebase', siteUrl: 'https://meal.web.app/' })
  assert.ok(p.includes('firebase deploy'))
  assert.ok(p.includes('public/index.html'))
  assert.ok(p.includes('https://meal.web.app'))
})
