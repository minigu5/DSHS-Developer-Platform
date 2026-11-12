import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shutdownGracefully } from './node-shutdown.ts'

test('뒤에서 하던 일 → 서버 닫기(남은 응답 마무리) → 종료 순서', async () => {
  const order: string[] = []
  await shutdownGracefully({
    drain: async () => { order.push('drain'); return 0 },
    closeServer: async () => { order.push('close') },
    exit: () => { order.push('exit') },
    log: () => {},
  })
  assert.deepEqual(order, ['drain', 'close', 'exit'])
})

test('서버 닫기가 없으면(손으로 실행) 바로 종료', async () => {
  const order: string[] = []
  await shutdownGracefully({ drain: async () => 0, closeServer: undefined, exit: () => order.push('exit'), log: () => {} })
  assert.deepEqual(order, ['exit'])
})

test('못 끝낸 일이 있으면 알리고, 그래도 서버를 닫고 종료', async () => {
  const logs: string[] = []
  const order: string[] = []
  await shutdownGracefully({
    drain: async () => 2,
    closeServer: async () => { order.push('close') },
    exit: () => order.push('exit'),
    log: (m) => logs.push(m),
  })
  assert.ok(logs.some((m) => m.includes('2')))
  assert.deepEqual(order, ['close', 'exit'])
})
