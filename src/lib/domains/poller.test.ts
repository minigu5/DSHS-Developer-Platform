import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { startPoller } from './poller.ts'

const base = { intervalMs: 1000, maxRounds: 3, minGapMs: 500 }

// 대기 중인 마이크로태스크(await 뒤 이어지는 코드)를 모두 흘려보낸다
const flush = () => new Promise<void>((r) => setImmediate(r))

test('바로 한 번 확인하고, 간격마다 반복하다가 maxRounds 에서 멈춘다', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    let rounds = 0
    let stopped = 0
    startPoller({ ...base, isVisible: () => true, round: async () => void rounds++, onStop: () => void stopped++ })
    await flush()
    assert.equal(rounds, 1)

    mock.timers.tick(1000)
    await flush()
    assert.equal(rounds, 2)

    mock.timers.tick(1000)
    await flush()
    assert.equal(rounds, 3)
    assert.equal(stopped, 1)

    mock.timers.tick(5000)
    await flush()
    assert.equal(rounds, 3)
  } finally {
    mock.timers.reset()
  }
})

test('탭이 숨겨져 있는 동안은 확인도 회차도 세지 않는다', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    let visible = false
    let rounds = 0
    let stopped = 0
    startPoller({ ...base, isVisible: () => visible, round: async () => void rounds++, onStop: () => void stopped++ })
    await flush()
    for (let i = 0; i < 5; i++) {
      mock.timers.tick(1000)
      await flush()
    }
    assert.equal(rounds, 0)
    assert.equal(stopped, 0)

    visible = true
    mock.timers.tick(1000)
    await flush()
    assert.equal(rounds, 1)
  } finally {
    mock.timers.reset()
  }
})

test('stop 하면 더는 확인하지 않는다', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    let rounds = 0
    const p = startPoller({ ...base, isVisible: () => true, round: async () => void rounds++, onStop: () => {} })
    await flush()
    p.stop()
    mock.timers.tick(10_000)
    await flush()
    assert.equal(rounds, 1)
  } finally {
    mock.timers.reset()
  }
})

test('wake 는 바로 확인하되 minGapMs 안에서는 무시하고, 타이머를 겹쳐 만들지 않는다', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    let rounds = 0
    const p = startPoller({ ...base, maxRounds: 99, isVisible: () => true, round: async () => void rounds++, onStop: () => {} })
    await flush()
    assert.equal(rounds, 1)

    p.wake() // 방금 끝났으니 무시
    await flush()
    assert.equal(rounds, 1)

    mock.timers.tick(600)
    p.wake() // minGapMs(500) 지남 → 확인
    await flush()
    assert.equal(rounds, 2)

    // 간격은 wake 시점부터 다시 센다: 600ms 뒤엔 아직, 1000ms 뒤에 한 번만
    mock.timers.tick(900)
    await flush()
    assert.equal(rounds, 2)
    mock.timers.tick(100)
    await flush()
    assert.equal(rounds, 3)
  } finally {
    mock.timers.reset()
  }
})

test('확인 중에 오류가 나도 반복은 이어진다', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    let calls = 0
    startPoller({
      ...base,
      maxRounds: 99,
      isVisible: () => true,
      round: async () => {
        calls++
        throw new Error('network')
      },
      onStop: () => {},
    })
    await flush()
    mock.timers.tick(1000)
    await flush()
    assert.equal(calls, 2)
  } finally {
    mock.timers.reset()
  }
})
