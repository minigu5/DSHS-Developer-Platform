import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FAVORITES_PREVIEW, favoritesInHeartOrder, heartCountOf, shouldShowFavorites } from './hearts.ts'

const EMPTY = { q: '', types: [], categories: [], platforms: [] }

test('하트 수는 집계 결과에서, 없으면 0', () => {
  assert.equal(heartCountOf({ project_hearts: [{ count: 3 }] }), 3)
  assert.equal(heartCountOf({}), 0)
  assert.equal(heartCountOf({ project_hearts: [] }), 0)
  assert.equal(heartCountOf({ project_hearts: null }), 0)
})

test('즐겨찾기는 하트 누른 순서(최신 먼저), 목록에 없는 id는 버린다', () => {
  const got = favoritesInHeartOrder([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['c', 'x', 'a'])
  assert.deepEqual(got.map((p) => p.id), ['c', 'a'])
})

test('즐겨찾기 칸은 하트가 있고 검색·필터가 없을 때만', () => {
  assert.equal(shouldShowFavorites(EMPTY, 1), true)
  assert.equal(shouldShowFavorites(EMPTY, 0), false)
  assert.equal(shouldShowFavorites({ ...EMPTY, q: '게임' }, 3), false)
  assert.equal(shouldShowFavorites({ ...EMPTY, platforms: ['ios'] }, 3), false)
  assert.equal(shouldShowFavorites({ ...EMPTY, types: ['app'] }, 3), false)
  assert.equal(shouldShowFavorites({ ...EMPTY, categories: ['game'] }, 3), false)
  assert.equal(shouldShowFavorites({ ...EMPTY, q: '  ' }, 3), true)
})

test('처음 보이는 즐겨찾기는 2장', () => {
  assert.equal(FAVORITES_PREVIEW, 2)
})
