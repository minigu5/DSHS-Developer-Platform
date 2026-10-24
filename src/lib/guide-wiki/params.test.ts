import test from 'node:test'
import assert from 'node:assert/strict'

import { parseRevParam, safeFrom } from './params.ts'

test('parseRevParam: 양의 정수 문자열만 받는다', () => {
  assert.equal(parseRevParam('3'), 3)
  assert.equal(parseRevParam('12'), 12)
  for (const bad of ['0', '-1', '1.5', 'abc', '', ' 3', '3 ', '1e2', '03']) {
    assert.equal(parseRevParam(bad), null, bad)
  }
  assert.equal(parseRevParam(undefined), null)
  assert.equal(parseRevParam(['2', '3']), null)
})

test('safeFrom: 사이트 내부 /guide 경로만 허용한다', () => {
  assert.equal(safeFrom('/guide/web/x'), '/guide/web/x')
  assert.equal(safeFrom('/guide-wiki/a'), '/guide-wiki/a')
  assert.equal(safeFrom('/guide'), '/guide')
  for (const bad of [
    'https://evil.com',
    '//evil.com',
    '/guide\\evil',
    '/tips',
    '/guide/x://evil',
    '/guide//evil',
    '',
  ]) {
    assert.equal(safeFrom(bad), null, bad)
  }
  assert.equal(safeFrom(undefined), null)
  assert.equal(safeFrom(['/guide/a', '/guide/b']), null)
})
