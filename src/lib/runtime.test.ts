import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNodeServer } from './runtime.ts'

function withRuntime(value: string | undefined, run: () => void) {
  const before = process.env.DSHS_RUNTIME
  if (value === undefined) delete process.env.DSHS_RUNTIME
  else process.env.DSHS_RUNTIME = value
  try {
    run()
  } finally {
    if (before === undefined) delete process.env.DSHS_RUNTIME
    else process.env.DSHS_RUNTIME = before
  }
}

test('DSHS_RUNTIME 이 없으면 Worker(지금 동작)', () => {
  withRuntime(undefined, () => assert.equal(isNodeServer(), false))
})

test('DSHS_RUNTIME=node 일 때만 Node 서버', () => {
  withRuntime('node', () => assert.equal(isNodeServer(), true))
  withRuntime('NODE', () => assert.equal(isNodeServer(), false))
  withRuntime('1', () => assert.equal(isNodeServer(), false))
})
