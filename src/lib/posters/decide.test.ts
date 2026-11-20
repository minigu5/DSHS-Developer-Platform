import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideBandAccess } from './decide.ts'

test('포스터 칸: 관리자가 아니어도 소유자·팀원이면 ok', () => {
  const s = { loggedIn: true, isAdmin: false, isOwner: false, isTeamMember: false, isPublic: true, banned: false }
  assert.equal(decideBandAccess({ ...s, isOwner: true }), 'ok')
  assert.equal(decideBandAccess({ ...s, isTeamMember: true }), 'ok')
  assert.equal(decideBandAccess({ ...s, isAdmin: true }), 'ok')
  assert.equal(decideBandAccess(s), 'forbidden')
  assert.equal(decideBandAccess({ ...s, isOwner: true, isPublic: false }), 'not_found')
  assert.equal(decideBandAccess({ ...s, isAdmin: true, isPublic: false }), 'not_found')
  assert.equal(decideBandAccess({ ...s, isOwner: true, banned: true }), 'forbidden')
  assert.equal(decideBandAccess({ ...s, loggedIn: false }), 'login')
})
