import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitArtSize } from './art-size.ts'

test('넓이 상한까지 비율 유지 축소 + 16의 배수', () => {
  assert.deepEqual(fitArtSize(1240, 900), { width: 1040, height: 752 })
})

test('상한 아래면 16의 배수로만 내림', () => {
  assert.deepEqual(fitArtSize(800, 600), { width: 800, height: 592 })
})

test('잘못된 값은 1240×900 기본 후 축소', () => {
  assert.deepEqual(fitArtSize(0, Number.NaN), { width: 1040, height: 752 })
})

test('캔버스보다 크면 자르고 최소 256', () => {
  assert.deepEqual(fitArtSize(5000, 100), { width: 1232, height: 256 })
})
