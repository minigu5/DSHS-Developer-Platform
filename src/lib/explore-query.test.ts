import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EMPTY_EXPLORE_QUERY, exploreQueryString, parseExploreQuery } from './explore-query.ts'

test('빈 주소는 기본값', () => {
  assert.deepEqual(parseExploreQuery(new URLSearchParams('')), EMPTY_EXPLORE_QUERY)
  assert.equal(exploreQueryString(EMPTY_EXPLORE_QUERY), '')
})

test('주소 → 상태 → 주소가 그대로 돈다', () => {
  const s = '?q=%EA%B2%8C%EC%9E%84&type=website%2Capp&category=game&platform=ios%2Cweb&sort=rating'
  const q = parseExploreQuery(new URLSearchParams(s))
  assert.deepEqual(q, {
    q: '게임',
    types: ['website', 'app'],
    categories: ['game'],
    platforms: ['web', 'ios'], // 목록 순서로 맞춤
    sort: 'rating',
  })
  assert.equal(parseExploreQuery(new URLSearchParams(exploreQueryString(q))).platforms.join(), 'web,ios')
})

test('모르는 값·중복·이상한 정렬은 버린다', () => {
  const q = parseExploreQuery(new URLSearchParams('type=nope,app,app&platform=&sort=hack'))
  assert.deepEqual(q.types, ['app'])
  assert.deepEqual(q.platforms, [])
  assert.equal(q.sort, 'newest')
})

test('서버 searchParams 모양(배열 값)도 받는다', () => {
  const q = parseExploreQuery({ type: ['app', 'cli'], q: ['a', 'b'], sort: undefined })
  assert.deepEqual(q.types, ['app', 'cli'])
  assert.equal(q.q, 'a')
})

test('검색어는 앞뒤 공백을 빼고 100자까지', () => {
  assert.equal(exploreQueryString({ ...EMPTY_EXPLORE_QUERY, q: '   ' }), '')
  const long = 'ㄱ'.repeat(150)
  assert.equal(parseExploreQuery(new URLSearchParams({ q: long })).q.length, 100)
})
