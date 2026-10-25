import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cloudinaryPublicId, formatKst } from './format.ts'

test('formatKst: UTC 시각을 한국 시간으로 보여 준다', () => {
  assert.equal(formatKst('2026-10-25T05:03:00Z'), '2026년 10월 25일 오후 2:03')
  assert.equal(formatKst('2026-10-24T15:00:00+00:00'), '2026년 10월 25일 오전 12:00')
})

test('formatKst: 날짜가 아니면 빈 문자열', () => {
  assert.equal(formatKst('not a date'), '')
})

test('cloudinaryPublicId: 우리 업로드 주소에서 public_id 를 뽑는다', () => {
  assert.equal(
    cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1700000000/dshs/abc123.png', 'demo'),
    'dshs/abc123',
  )
  assert.equal(
    cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/dshs/abc_1-2.webp', 'demo'),
    'dshs/abc_1-2',
  )
})

test('cloudinaryPublicId: 남의 계정·다른 폴더·다른 호스트는 null', () => {
  assert.equal(cloudinaryPublicId('https://res.cloudinary.com/other/image/upload/v1/dshs/a.png', 'demo'), null)
  assert.equal(cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1/other/a.png', 'demo'), null)
  assert.equal(cloudinaryPublicId('https://example.com/demo/image/upload/v1/dshs/a.png', 'demo'), null)
  assert.equal(cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1/dshs/../a.png', 'demo'), null)
  assert.equal(cloudinaryPublicId('https://lh3.googleusercontent.com/a/abc', 'demo'), null)
})

test('cloudinaryPublicId: 계정 이름을 모르면 아무것도 지우지 않는다', () => {
  assert.equal(cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1/dshs/a.png', undefined), null)
})
