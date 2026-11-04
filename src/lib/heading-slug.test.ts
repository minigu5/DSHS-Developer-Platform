import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSlugger, headingSlug } from './heading-slug.ts'

test('GitHub 규칙: 소문자, 기호 제거, 공백은 하이픈', () => {
  assert.equal(headingSlug('Getting Started!'), 'getting-started')
  assert.equal(headingSlug('설치 방법'), '설치-방법')
  assert.equal(headingSlug('1. 기능 (v2.0)'), '1-기능-v20')
  assert.equal(headingSlug('snake_case & kebab-case'), 'snake_case--kebab-case')
  assert.equal(headingSlug('🚀 시작하기'), '-시작하기')
})

test('같은 제목은 -1, -2를 붙인다', () => {
  const slug = createSlugger()
  assert.equal(slug('사용법'), '사용법')
  assert.equal(slug('사용법'), '사용법-1')
  assert.equal(slug('사용법'), '사용법-2')
  assert.equal(slug('사용법-1'), '사용법-1-1')
})
