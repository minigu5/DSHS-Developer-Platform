import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSameLink } from './same-link.ts'

test('스킴·www·끝 슬래시·.git·호스트 대소문자 차이는 같은 주소', () => {
  assert.equal(isSameLink('https://github.com/a/b', 'http://www.GitHub.com/a/b/'), true)
  assert.equal(isSameLink('https://github.com/a/b.git', 'github.com/a/b'), true)
  assert.equal(isSameLink('https://github.com/a/b#readme', 'https://github.com/a/b?tab=x'), true)
})

test('다른 저장소·다른 사이트는 다른 주소', () => {
  assert.equal(isSameLink('https://github.com/a/b', 'https://github.com/a/c'), false)
  assert.equal(isSameLink('https://a.github.io/b', 'https://github.com/a/b'), false)
  assert.equal(isSameLink('https://github.com/a', 'https://github.com/a/b'), false)
})

test('빈 값은 같지 않음', () => {
  assert.equal(isSameLink('', ''), false)
  assert.equal(isSameLink(null, 'https://github.com/a/b'), false)
})
