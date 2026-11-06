import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasArtSlot, sanitizePosterHtml } from './sanitize.ts'

test('script 블록·자체 닫힘 script 제거', () => {
  assert.doesNotMatch(sanitizePosterHtml('<p>a</p><script>alert(1)</script><SCRIPT src=x></SCRIPT><script src="y"/>'), /script/i)
})

test('on* 속성 제거(따옴표 셋 다)', () => {
  const out = sanitizePosterHtml(`<img src="ART" onerror="x()"><div onclick='y()' onload=z>`)
  assert.doesNotMatch(out, /on(error|click|load)/i)
  assert.match(out, /src="ART"/)
})

test('javascript: URL 속성 제거', () => {
  assert.doesNotMatch(sanitizePosterHtml('<a href="javascript:alert(1)">a</a><img src=" JavaScript:x">'), /javascript:/i)
})

test('iframe·object·embed·base·form·meta refresh 제거', () => {
  const out = sanitizePosterHtml('<iframe src=x></iframe><object></object><embed src=x><base href=x><form></form><meta http-equiv="refresh" content="0;url=x">')
  assert.doesNotMatch(out, /<(iframe|object|embed|base|form)|refresh/i)
})

test('Google Fonts link는 남기고 다른 link는 제거', () => {
  const out = sanitizePosterHtml('<link href="https://fonts.googleapis.com/css2?family=Jua" rel="stylesheet"><link rel="stylesheet" href="https://evil.example/a.css">')
  assert.match(out, /fonts\.googleapis\.com/)
  assert.doesNotMatch(out, /evil/)
})

test('hasArtSlot', () => {
  assert.equal(hasArtSlot(`<img class="a" src='ART'>`), true)
  assert.equal(hasArtSlot('<img src="ARTS">'), false)
})
