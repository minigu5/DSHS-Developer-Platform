import { test } from 'node:test'
import assert from 'node:assert/strict'
import { siteLockOf } from './site-lock.ts'

test('방문 주소가 호스트 기본 주소면 그 주소로만 확인한다', () => {
  assert.deepEqual(siteLockOf('https://hwip.vercel.app/', 'hwip'), { kind: 'project', url: 'https://hwip.vercel.app/', host: 'vercel' })
  assert.deepEqual(siteLockOf('hwip.vercel.app/about', 'hwip'), { kind: 'project', url: 'https://hwip.vercel.app/', host: 'vercel' })
  assert.deepEqual(siteLockOf('https://me.github.io/meal/index.html', 'meal'), { kind: 'project', url: 'https://me.github.io/meal/', host: 'github-pages' })
})

test('방문 주소가 이 주소면 직접 적는다', () => {
  assert.deepEqual(siteLockOf('https://hwip.dshs.dev', 'hwip'), { kind: 'free' })
  assert.deepEqual(siteLockOf('https://hwip.dshs.dev/', 'hwip'), { kind: 'free' })
})

test('방문 주소가 없거나 다른 주소면 프로젝트부터 고친다', () => {
  assert.deepEqual(siteLockOf(null, 'hwip'), { kind: 'fix_project' })
  assert.deepEqual(siteLockOf('', 'hwip'), { kind: 'fix_project' })
  assert.deepEqual(siteLockOf('https://hwip.com', 'hwip'), { kind: 'fix_project' })
  assert.deepEqual(siteLockOf('https://other.dshs.dev', 'hwip'), { kind: 'fix_project' })
})
