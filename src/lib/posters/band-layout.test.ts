import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandHint, BAND_SIZE } from './band-layout.ts'

test('띠 크기는 1240×236', () => {
  assert.deepEqual(BAND_SIZE, { width: 1240, height: 236 })
})

test('안내 문구: 짧은 이름은 그대로', () => {
  assert.equal(bandHint('대곽나루'), '‘대곽나루’ 검색 또는 QR')
})

test('안내 문구: 긴 이름은 16자에서 자르고 …', () => {
  assert.equal(bandHint('아주아주아주아주아주아주긴프로젝트이름입니다'), '‘아주아주아주아주아주아주긴프로젝…’ 검색 또는 QR')
})
