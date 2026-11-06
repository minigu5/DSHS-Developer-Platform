import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POSTER_CSP, posterExportPage, posterSrcdoc } from './document.ts'
import { posterBandHtml } from './band.ts'

test('ART를 그림 URL로, CSP meta를 head 맨 앞에', () => {
  const out = posterSrcdoc('<html><head><title>t</title></head><body><img src="ART"></body></html>', 'https://res.cloudinary.com/x/a.png')
  assert.match(out, /<head><meta http-equiv="Content-Security-Policy"/)
  assert.match(out, /src="https:\/\/res\.cloudinary\.com\/x\/a\.png"/)
})

test('그림 없으면 회색 data URI, head 없으면 문서 앞에 CSP', () => {
  const out = posterSrcdoc('<div><img src="ART"></div>', null)
  assert.match(out, /^<meta http-equiv="Content-Security-Policy"/)
  assert.match(out, /src="data:image\/svg\+xml/)
})

test('CSP는 스크립트를 열지 않고 이미지는 cloudinary·data만', () => {
  assert.doesNotMatch(POSTER_CSP, /script-src/)
  assert.match(POSTER_CSP, /default-src 'none'/)
  assert.match(POSTER_CSP, /img-src https:\/\/res\.cloudinary\.com data:/)
})

test('띠의 프로젝트 이름은 이스케이프', () => {
  assert.match(posterBandHtml({ title: '<b>나루</b>', tone: 'light', qrSvg: '<svg/>' }), /‘&lt;b&gt;나루&lt;\/b&gt;’ 검색 또는 QR/)
})

test('내보내기 문서는 sandbox iframe + 띠, srcdoc 따옴표 이스케이프', () => {
  const page = posterExportPage('<p class="a">x</p>', '<footer class="dshs-band"></footer>')
  assert.match(page, /<iframe sandbox="" srcdoc="&lt;p class=&quot;a&quot;&gt;x&lt;\/p&gt;"/)
  assert.match(page, /@page\s*\{\s*size:\s*1240px 1754px;\s*margin:\s*0/)
})
