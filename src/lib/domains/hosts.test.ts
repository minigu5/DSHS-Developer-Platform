import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectHost, validateTarget, validateTxt, HOST_PRESETS } from './hosts.ts'

test('프로젝트 주소로 호스트를 미리 고른다', () => {
  assert.deepEqual(detectHost('https://meal-alarm.vercel.app/'), { host: 'vercel', prefill: null })
  assert.deepEqual(detectHost('https://brave-curie-12345.netlify.app/menu'), { host: 'netlify', prefill: 'brave-curie-12345.netlify.app' })
  assert.deepEqual(detectHost('https://octo.github.io/meal/'), { host: 'github-pages', prefill: 'octo.github.io' })
  assert.deepEqual(detectHost('https://meal.onrender.com'), { host: 'render', prefill: 'meal.onrender.com' })
  assert.deepEqual(detectHost('https://octo.gitlab.io/meal/'), { host: 'gitlab-pages', prefill: 'octo.gitlab.io' })
  assert.deepEqual(detectHost('https://meal-production.up.railway.app'), { host: 'railway', prefill: null })
  assert.equal(detectHost('https://example.com'), null)
  assert.equal(detectHost('not a url'), null)
})

test('CNAME 값은 호스트 소유 도메인만, 소문자·끝 점 정리', () => {
  assert.equal(validateTarget('vercel', 'D1D4FC829FE7BC7C.vercel-dns-017.com.'), 'd1d4fc829fe7bc7c.vercel-dns-017.com')
  assert.equal(validateTarget('vercel', 'cname.vercel-dns.com'), 'cname.vercel-dns.com')
  assert.equal(validateTarget('vercel', 'evil.com'), null)
  assert.equal(validateTarget('netlify', 'evil.com'), null)
  assert.equal(validateTarget('netlify', 'evil.netlify.app.evil.com'), null)
  assert.equal(validateTarget('github-pages', '1.2.3.4'), null)
  assert.equal(validateTarget('github-pages', 'octo.github.io'), 'octo.github.io')
  assert.equal(validateTarget('render', ' meal.onrender.com '), 'meal.onrender.com')
  assert.equal(validateTarget('gitlab-pages', 'octo.gitlab.io'), 'octo.gitlab.io')
  assert.equal(validateTarget('gitlab-pages', 'octo.gitlab.io.evil.com'), null)
  assert.equal(validateTarget('railway', 'G05NS7.up.railway.app.'), 'g05ns7.up.railway.app')
  assert.equal(validateTarget('railway', 'meal.railway.app'), null)
  assert.equal(validateTarget('railway', 'evil.com'), null)
})

test('Vercel 은 _vercel TXT 를 이 주소 값일 때만 허용', () => {
  assert.deepEqual(
    validateTxt('vercel', 'meal', { name: '_vercel.dshs.dev', value: 'vc-domain-verify=meal.dshs.dev,abc123' }),
    { name: '_vercel.dshs.dev', value: 'vc-domain-verify=meal.dshs.dev,abc123' },
  )
  assert.equal(validateTxt('vercel', 'meal', { name: '_vercel.dshs.dev', value: 'vc-domain-verify=bus.dshs.dev,abc' }), null)
  assert.equal(validateTxt('netlify', 'meal', { name: '_vercel.dshs.dev', value: 'vc-domain-verify=meal.dshs.dev,abc' }), null)
})

test('GitHub Pages 도메인 확인 TXT 는 dshs.dev 전체를 확인하므로 거부', () => {
  assert.equal(validateTxt('github-pages', 'meal', { name: '_github-pages-challenge-octo.dshs.dev', value: 'x' }), null)
})

test('GitLab·Railway 확인 TXT 는 내 이름 아래라 받는다', () => {
  assert.deepEqual(
    validateTxt('gitlab-pages', 'meal', { name: '_gitlab-pages-verification-code.meal.dshs.dev', value: 'gitlab-pages-verification-code=abc' }),
    { name: '_gitlab-pages-verification-code.meal.dshs.dev', value: 'gitlab-pages-verification-code=abc' },
  )
  assert.deepEqual(
    validateTxt('railway', 'meal', { name: '_railway-verify.meal', value: 'railway-verify=abc' }),
    { name: '_railway-verify.meal.dshs.dev', value: 'railway-verify=abc' },
  )
  assert.equal(validateTxt('railway', 'meal', { name: '_railway-verify.bus', value: 'railway-verify=abc' }), null)
  // 미리 채우는 TXT 이름이 실제로 통과하는지
  for (const p of Object.values(HOST_PRESETS)) {
    if (!p.txt || p.key === 'vercel') continue
    assert.ok(validateTxt(p.key, 'meal', { name: p.txt.name.replaceAll('{label}', 'meal'), value: 'x' }), p.key)
  }
})

test('Railway "사이트 없음" 응답을 알아본다', () => {
  const nf = HOST_PRESETS.railway.notFound
  assert.equal(nf(404, new Headers({ 'x-railway-fallback': 'true' }), '{"message":"Application not found"}'), true)
  assert.equal(nf(404, new Headers(), 'Not Found'), false)
})

test('TXT 이름은 내 이름 아래만', () => {
  assert.deepEqual(validateTxt('render', 'meal', { name: '_acme.meal.dshs.dev', value: 'tok' }), { name: '_acme.meal.dshs.dev', value: 'tok' })
  assert.deepEqual(validateTxt('render', 'meal', { name: '_acme.meal', value: 'tok' }), { name: '_acme.meal.dshs.dev', value: 'tok' })
  assert.equal(validateTxt('render', 'meal', { name: '_acme.bus.dshs.dev', value: 'tok' }), null)
  assert.equal(validateTxt('render', 'meal', { name: 'meal.dshs.dev', value: 'tok' }), null)
  assert.equal(validateTxt('render', 'meal', { name: '_acme.meal.dshs.dev', value: '' }), null)
  assert.equal(validateTxt('render', 'meal', { name: '_acme.meal.dshs.dev', value: 'x'.repeat(256) }), null)
})

test('프리셋 6개, 설정 링크와 안내가 있다', () => {
  assert.deepEqual(Object.keys(HOST_PRESETS).sort(), ['github-pages', 'gitlab-pages', 'netlify', 'railway', 'render', 'vercel'])
  for (const p of Object.values(HOST_PRESETS)) {
    assert.ok(p.settingsUrl.startsWith('https://'))
    assert.ok(p.steps.length >= 2)
  }
})
