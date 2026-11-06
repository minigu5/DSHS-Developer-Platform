import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePosterReply } from './reply.ts'

test('json 주문 + html 블록을 둘 다 읽는다', () => {
  const r = parsePosterReply('```json\n{"art":{"prompt":"a whale ferry","width":1240,"height":900}}\n```\n```html\n<html><body><img src="ART"></body></html>\n```')
  assert.deepEqual(r.art, { prompt: 'a whale ferry', width: 1240, height: 900 })
  assert.match(r.html!, /<img src="ART">/)
})

test('json 없으면 art null, 펜스 없는 <!doctype> 문서도 html로', () => {
  const r = parsePosterReply('<!doctype html><html><body>x</body></html>')
  assert.equal(r.art, null)
  assert.match(r.html!, /^<!doctype html>/i)
})

test('깨진 json·빈 prompt·숫자 아닌 크기는 art null', () => {
  assert.equal(parsePosterReply('```json\n{"art":{"prompt":"","width":1,"height":1}}\n```').art, null)
  assert.equal(parsePosterReply('```json\n{art:\n```').art, null)
  assert.equal(parsePosterReply('```json\n{"art":{"prompt":"x","width":"a","height":2}}\n```').art, null)
})

test('html 없는 응답은 html null', () => {
  assert.equal(parsePosterReply('죄송해요').html, null)
})
