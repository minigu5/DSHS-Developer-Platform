import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickTonight, signFaviconSync, verifyFaviconSync } from './favicon-sync-job.ts'

test('같은 키·대상이면 서명이 맞고, 대상·키가 다르면 틀림', async () => {
  const sig = await signFaviconSync('list', 'secret')
  assert.equal(await verifyFaviconSync('list', sig, 'secret'), true)
  assert.equal(await verifyFaviconSync('p1', sig, 'secret'), false)
  assert.equal(await verifyFaviconSync('list', sig, 'other'), false)
  assert.equal(await verifyFaviconSync('list', null, 'secret'), false)
  assert.equal(await verifyFaviconSync('list', sig, undefined), false)
})

test('하룻밤 몫 이하면 전부', () => {
  assert.deepEqual(pickTonight([1, 2, 3], 5, 7), [1, 2, 3])
})

test('많으면 날마다 시작점을 옮겨 돌아가며', () => {
  const items = [0, 1, 2, 3, 4]
  assert.deepEqual(pickTonight(items, 2, 0), [0, 1])
  assert.deepEqual(pickTonight(items, 2, 1), [2, 3])
  assert.deepEqual(pickTonight(items, 2, 2), [4, 0])
})
