import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fillScreenshot, parsePosterScreenshot, parsePosterStyle, styleMayUseArt } from './style.ts'
import { buildPosterContents } from './prompt.ts'

const info = { id: 'p', title: '휩', summary: '변환기', types: ['website'], platforms: ['web'], url: null }

test('모르는 스타일은 알아서', () => {
  assert.equal(parsePosterStyle('type'), 'type')
  assert.equal(parsePosterStyle('poster'), 'auto')
  assert.equal(parsePosterStyle(undefined), 'auto')
})

test('그림 AI 는 알아서·사용 예시·그림에서만', () => {
  assert.deepEqual(['auto', 'example', 'art', 'screenshot', 'type'].map((s) => styleMayUseArt(parsePosterStyle(s))), [true, true, true, false, false])
})

test('캡처는 우리 Cloudinary 주소만, 비율은 0.3~3', () => {
  const ok = parsePosterScreenshot({ url: 'https://res.cloudinary.com/demo/image/upload/v1/dshs/a.png', ratio: 9 }, 'demo')
  assert.deepEqual(ok, { url: 'https://res.cloudinary.com/demo/image/upload/v1/dshs/a.png', ratio: 3 })
  assert.equal(parsePosterScreenshot({ url: 'https://res.cloudinary.com/other/image/upload/a.png' }, 'demo'), null)
  assert.equal(parsePosterScreenshot({ url: 'https://evil.com/a.png' }, 'demo'), null)
  assert.equal(parsePosterScreenshot({ url: 'https://res.cloudinary.com/demo/image/upload/a.png" onerror="x' }, 'demo'), null)
  assert.equal(parsePosterScreenshot({ url: 'https://res.cloudinary.com/demo/image/upload/a.png' }, undefined), null)
})

test('SHOT 자리를 캡처 주소로', () => {
  const shot = { url: 'https://res.cloudinary.com/demo/image/upload/a.png', ratio: 1.6 }
  assert.equal(fillScreenshot(`<img src='SHOT' alt="">`, shot), '<img src="https://res.cloudinary.com/demo/image/upload/a.png" alt="">')
})

test('처음 만들 때 고른 스타일을 알려 주고, 캡처면 비율과 틀', () => {
  const type = buildPosterContents({ info, currentHtml: null, recent: [], request: '', style: 'type' })[0].parts[0].text
  assert.match(type, /스타일: ③ 그림 없이/)
  const shot = buildPosterContents({ info, currentHtml: null, recent: [], request: '', style: 'screenshot', screenshot: { url: 'u', ratio: 0.5 } })[0].parts[0].text
  assert.match(shot, /src="SHOT"/)
  assert.match(shot, /스마트폰 틀/)
  assert.match(shot, /0\.5:1/)
  const edit = buildPosterContents({ info, currentHtml: '<p>x</p>', recent: [], request: '크게', style: 'type' })[0].parts[0].text
  assert.doesNotMatch(edit, /스타일:/)
})
