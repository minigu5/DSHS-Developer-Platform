import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyArtError, classifyGeminiResponse, decideBandAccess, decidePosterAccess, planArtAction } from './decide.ts'

const base = { loggedIn: true, isAdmin: true, isOwner: false, isTeamMember: false, isPublic: true, banned: false }

test('비로그인 → login', () => assert.equal(decidePosterAccess({ ...base, loggedIn: false }), 'login'))
test('1단계: 관리자 아닌 소유자 → forbidden', () => assert.equal(decidePosterAccess({ ...base, isAdmin: false, isOwner: true }), 'forbidden'))
test('비공개 프로젝트 → not_found(관리자여도)', () => assert.equal(decidePosterAccess({ ...base, isPublic: false }), 'not_found'))
test('차단 → forbidden', () => assert.equal(decidePosterAccess({ ...base, banned: true }), 'forbidden'))
test('관리자·공개 → ok', () => assert.equal(decidePosterAccess(base), 'ok'))

test('Gemini 분류', () => {
  assert.equal(classifyGeminiResponse(200, { candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'STOP' }] }), 'ok')
  assert.equal(classifyGeminiResponse(404, {}), 'next-model')
  assert.equal(classifyGeminiResponse(503, {}), 'next-model')
  assert.equal(classifyGeminiResponse(429, {}), 'busy')
  assert.equal(classifyGeminiResponse(200, { promptFeedback: { blockReason: 'SAFETY' } }), 'blocked')
  assert.equal(classifyGeminiResponse(200, { candidates: [{ finishReason: 'SAFETY' }] }), 'blocked')
  assert.equal(classifyGeminiResponse(400, {}), 'error')
})

test('그림 오류 분류', () => {
  assert.equal(classifyArtError('AiError: you have used up your daily free allocation of 10,000 neurons'), 'quota')
  assert.equal(classifyArtError('Network connection lost'), 'error')
})

test('그림 계획', () => {
  const order = { prompt: 'p', width: 1240, height: 900 }
  assert.equal(planArtAction({ html: '<img src="ART">', order }), 'draw')
  assert.equal(planArtAction({ html: '<img src="ART">', order: null }), 'keep')
  assert.equal(planArtAction({ html: '<p>no slot</p>', order }), 'keep')
  assert.equal(planArtAction({ html: '<img src="ART">', order: null }), 'keep')
  assert.equal(planArtAction({ html: '<img src="ART">', order }), 'draw')
})

test('띠 받기: 관리자가 아니어도 소유자·팀원이면 ok', () => {
  const s = { loggedIn: true, isAdmin: false, isOwner: false, isTeamMember: false, isPublic: true, banned: false }
  assert.equal(decideBandAccess({ ...s, isOwner: true }), 'ok')
  assert.equal(decideBandAccess({ ...s, isTeamMember: true }), 'ok')
  assert.equal(decideBandAccess(s), 'forbidden')
  assert.equal(decideBandAccess({ ...s, isOwner: true, isPublic: false }), 'not_found')
  assert.equal(decideBandAccess({ ...s, isOwner: true, banned: true }), 'forbidden')
  assert.equal(decideBandAccess({ ...s, loggedIn: false }), 'login')
})
