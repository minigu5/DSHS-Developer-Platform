import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hostParamIsNaru, naruServerIdOf, safeDomainsNext, shouldFollowNext, withHostParam, withProject } from './next-path.ts'

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

test('shouldFollowNext: 웹사이트이고 공개일 때만 next 를 따른다', () => {
  assert.equal(shouldFollowNext('/domains?naru=fa4e0001', { isWebsite: true, isPublic: true }), true)
  assert.equal(shouldFollowNext('/domains?naru=fa4e0001', { isWebsite: true, isPublic: false }), false)
  assert.equal(shouldFollowNext('/domains?naru=fa4e0001', { isWebsite: false, isPublic: true }), false)
  assert.equal(shouldFollowNext(null, { isWebsite: true, isPublic: true }), false)
})

test('hostParamIsNaru: ?host=naru 만 대곽나루', () => {
  assert.equal(hostParamIsNaru('naru'), true)
  for (const other of ['other', 'NARU', 'naru ', '', undefined]) assert.equal(hostParamIsNaru(other), false, String(other))
})

test('withHostParam: 다른 쿼리는 그대로 두고 host=naru 만 넣고 뺀다', () => {
  assert.equal(withHostParam('', true), '?host=naru')
  assert.equal(withHostParam('?naru=fa4e0001', true), '?naru=fa4e0001&host=naru')
  assert.equal(withHostParam('?project=abc&host=naru', true), '?project=abc&host=naru')
  assert.equal(withHostParam('?naru=fa4e0001&host=naru', false), '?naru=fa4e0001')
  assert.equal(withHostParam('?host=naru', false), '')
  assert.equal(withHostParam('', false), '')
})
