import { test } from 'node:test'
import assert from 'node:assert/strict'
import { domainOfferOf, previewAddressOf, quickToConnect, suggestNameFrom } from './offer.ts'

test('미리보기 주소는 원래 주소를 알려 준다', () => {
  assert.deepEqual(previewAddressOf('https://hackathon-7fc7a--preview-omt325gp.web.app/'), { host: 'Firebase Hosting', live: 'hackathon-7fc7a.web.app' })
  assert.deepEqual(previewAddressOf('site--ch-1.firebaseapp.com'), { host: 'Firebase Hosting', live: 'site.firebaseapp.com' })
  assert.deepEqual(previewAddressOf('https://73bc7fc3.meal.pages.dev/'), { host: 'Cloudflare Pages', live: 'meal.pages.dev' })
  assert.equal(previewAddressOf('https://site.web.app'), null)
  assert.equal(previewAddressOf('https://meal.pages.dev'), null)
  assert.equal(previewAddressOf('https://meal.vercel.app'), null)
  assert.equal(previewAddressOf(''), null)
  assert.equal(previewAddressOf('not a url'), null)
})

test('무료 주소에서 짧은 이름 예시를 뽑는다', () => {
  assert.equal(suggestNameFrom('https://toad-dashboard-102826580.web.app/'), 'toad-dashboard')
  assert.equal(suggestNameFrom('https://hackathon-7fc7a--preview-omt325gp.web.app/'), 'hackathon')
  assert.equal(suggestNameFrom('https://meal-alarm-git-main-octo.vercel.app'), 'meal-alarm')
  assert.equal(suggestNameFrom('https://octo.github.io/meal/'), 'meal')
  assert.equal(suggestNameFrom('https://octo.github.io/'), 'octo')
  assert.equal(suggestNameFrom('https://73bc7fc3.meal.pages.dev/'), 'meal')
  assert.equal(suggestNameFrom('https://brave-curie-12345.netlify.app'), 'brave-curie')
  // 예약어·너무 짧은 이름·모르는 호스트는 예시 없음
  assert.equal(suggestNameFrom('https://app.vercel.app'), null)
  assert.equal(suggestNameFrom('https://ab.web.app'), null)
  assert.equal(suggestNameFrom('https://omm.run'), null)
})

test('프리셋 무료 주소에만 권한다', () => {
  assert.deepEqual(domainOfferOf('toad-dashboard-102826580.web.app'), {
    host: 'firebase', hostLabel: 'Firebase Hosting', hostname: 'toad-dashboard-102826580.web.app', suggestion: 'toad-dashboard',
  })
  assert.equal(domainOfferOf('https://quilolab.com/'), null)
  assert.equal(domainOfferOf('https://omm.dshs.dev'), null)
  assert.equal(quickToConnect('firebase'), true)
  assert.equal(quickToConnect('vercel'), false)
})
