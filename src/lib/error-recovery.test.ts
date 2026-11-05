import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AUTO_RELOAD_GAP_MS, isStaleDeployError, shouldAutoReload } from './error-recovery.ts'

test('배포 엇갈림 오류(JS 파일·서버 액션 못 찾음)를 알아본다', () => {
  assert.equal(isStaleDeployError({ name: 'ChunkLoadError', message: 'Loading chunk 123 failed.' }), true)
  assert.equal(isStaleDeployError({ message: 'Loading CSS chunk app-layout failed' }), true)
  assert.equal(isStaleDeployError({ message: 'Failed to fetch dynamically imported module: https://dshs.dev/_next/static/chunks/a.js' }), true)
  assert.equal(isStaleDeployError({ message: 'Importing a module script failed.' }), true)
  assert.equal(isStaleDeployError({ message: 'Failed to find Server Action "abc". This request might be from an older or newer deployment.' }), true)
  assert.equal(isStaleDeployError({ message: 'Server Action "7f00" was not found on the server.' }), true)
})

test('다른 오류는 자동으로 새로 고치지 않는다', () => {
  assert.equal(isStaleDeployError({ name: 'TypeError', message: "Cannot read properties of undefined (reading 'map')" }), false)
  assert.equal(isStaleDeployError({ message: '' }), false)
  assert.equal(isStaleDeployError(null), false)
})

test('자동 새로 고침은 1분에 한 번만', () => {
  assert.equal(shouldAutoReload(null, 1000), true)
  assert.equal(shouldAutoReload(1000, 1000 + AUTO_RELOAD_GAP_MS), false)
  assert.equal(shouldAutoReload(1000, 1001 + AUTO_RELOAD_GAP_MS), true)
})
