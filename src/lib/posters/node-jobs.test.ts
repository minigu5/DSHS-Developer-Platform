import { test } from 'node:test'
import assert from 'node:assert/strict'
import { drainBackgroundJobs, runInBackground } from './node-jobs.ts'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

test('남은 일이 다 끝나면 0', async () => {
  let done = 0
  runInBackground('a', async () => { await wait(300); done++ })
  runInBackground('b', async () => { await wait(300); done++ })
  assert.equal(await drainBackgroundJobs(1000), 0)
  assert.equal(done, 2)
})

test('시간이 다 되면 끝나지 못한 개수', async () => {
  let release!: () => void
  runInBackground('slow', () => new Promise<void>((r) => { release = r }))
  assert.equal(await drainBackgroundJobs(100), 1)
  release()
  assert.equal(await drainBackgroundJobs(100), 0)
})

test('에러 난 일은 목록에서 빠진다', async () => {
  const errors: unknown[] = []
  const original = console.error
  console.error = (...args: unknown[]) => { errors.push(args) }
  try {
    runInBackground('boom', async () => { throw new Error('x') })
    assert.equal(await drainBackgroundJobs(500), 0)
  } finally {
    console.error = original
  }
  assert.equal(errors.length, 1)
})

test('남은 일이 없으면 바로 0', async () => {
  const started = Date.now()
  assert.equal(await drainBackgroundJobs(5000), 0)
  assert.ok(Date.now() - started < 100)
})
