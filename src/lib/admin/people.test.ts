import { test } from 'node:test'
import assert from 'node:assert/strict'
import { personLabel } from './people.ts'

test('닉네임과 실명이 다르면 둘 다', () => {
  assert.equal(personLabel({ nickname: '민규', full_name: '2401신민규' }), '민규 (2401신민규)')
})

test('하나만 있거나 같으면 하나', () => {
  assert.equal(personLabel({ nickname: null, full_name: '2401신민규' }), '2401신민규')
  assert.equal(personLabel({ nickname: '민규', full_name: '민규' }), '민규')
  assert.equal(personLabel({ nickname: ' ', full_name: null }), '이름 없음')
})

test('사람이 없으면 탈퇴한 사람', () => {
  assert.equal(personLabel(null), '탈퇴한 사람')
})
