import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naruServerIdOf, safeDomainsNext, withProject } from './next-path.ts'

test('/domains 로 시작하는 안쪽 경로만 받는다', () => {
  assert.equal(safeDomainsNext('/domains'), '/domains')
  assert.equal(safeDomainsNext('/domains?naru=fa4e0001'), '/domains?naru=fa4e0001')
  assert.equal(safeDomainsNext('/domains/admin'), '/domains/admin')
})

test('다른 사이트·다른 경로·이상한 값은 거절', () => {
  for (const bad of [
    '//evil.com',
    '//domains',
    'https://evil.com/domains',
    'http://dshs.dev/domains',
    'javascript:alert(1)',
    '/\\evil.com',
    '/domains\\@evil.com',
    '/domainsx',
    '/domains-evil',
    '/projects/new',
    '/',
    '',
    'domains',
    '/domains\n//evil.com',
    '/domains\t',
    null,
    undefined,
  ]) {
    assert.equal(safeDomainsNext(bad), null, String(bad))
  }
})

test('너무 긴 값은 거절', () => {
  assert.equal(safeDomainsNext('/domains?x=' + 'a'.repeat(300)), null)
})

test('withProject 는 ? 가 있으면 & 로 붙인다', () => {
  assert.equal(withProject('/domains?naru=fa4e0001', 'abc'), '/domains?naru=fa4e0001&project=abc')
  assert.equal(withProject('/domains', 'abc'), '/domains?project=abc')
})

test('서버 id 는 8자리 소문자 16진수만', () => {
  assert.equal(naruServerIdOf('fa4e0001'), 'fa4e0001')
  for (const bad of ['FA4E0001', 'fa4e000', 'fa4e00011', 'zzzzzzzz', 'fa4e0001\n', '', undefined]) {
    assert.equal(naruServerIdOf(bad), null, String(bad))
  }
})
