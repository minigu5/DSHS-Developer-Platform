import { test } from 'node:test'
import assert from 'node:assert/strict'
import { iconUsesAddress, refreshAutoIconWith, type IconRow } from './icon-refresh.ts'

test('iconUsesAddress: 직접 주소·공개 favicon 서비스는 잡고 다른 이름은 안 잡는다', () => {
  assert.equal(iconUsesAddress('https://omm.dshs.dev/favicon.ico', 'omm'), true)
  assert.equal(iconUsesAddress('https://www.google.com/s2/favicons?sz=128&domain=omm.dshs.dev', 'omm'), true)
  assert.equal(iconUsesAddress('https://icons.duckduckgo.com/ip3/omm.dshs.dev.ico', 'omm'), true)
  assert.equal(iconUsesAddress('https://xomm.dshs.dev/favicon.ico', 'omm'), false)
  assert.equal(iconUsesAddress('https://omm.dshs.dev.evil.com/a.png', 'omm'), false)
  assert.equal(iconUsesAddress('https://omm.vercel.app/favicon.ico', 'omm'), false)
  assert.equal(iconUsesAddress(null, 'omm'), false)
})

function run(row: IconRow | null, resolved: string | null = 'https://omm.vercel.app/icon.png') {
  const calls: string[] = []
  const done = refreshAutoIconWith('omm', {
    load: async () => row,
    resolve: async (u) => {
      calls.push(`resolve:${u}`)
      return resolved
    },
    update: async (u) => {
      calls.push(`update:${u}`)
    },
  })
  return { calls, done }
}

test('반납 뒤 자동 아이콘이 사라진 주소면 되돌아간 주소에서 다시 찾는다', async () => {
  const { calls, done } = run({ icon_type: 'auto', url: 'https://omm.vercel.app', icon_url: 'https://omm.dshs.dev/icon.png' })
  assert.equal(await done, true)
  assert.deepEqual(calls, ['resolve:https://omm.vercel.app', 'update:https://omm.vercel.app/icon.png'])
})

test('직접 올린 아이콘·다른 주소 아이콘은 건드리지 않는다', async () => {
  for (const row of [
    { icon_type: 'link', url: 'https://omm.vercel.app', icon_url: 'https://omm.dshs.dev/icon.png' },
    { icon_type: 'auto', url: 'https://omm.vercel.app', icon_url: 'https://omm.vercel.app/icon.png' },
  ]) {
    const { calls, done } = run(row)
    assert.equal(await done, false)
    assert.deepEqual(calls, [])
  }
})

test('방문 주소가 비었거나 아직 이 주소면 안 찾는다', async () => {
  for (const url of [null, 'https://omm.dshs.dev']) {
    const { calls, done } = run({ icon_type: 'auto', url, icon_url: 'https://omm.dshs.dev/icon.png' })
    assert.equal(await done, false)
    assert.deepEqual(calls, [])
  }
})

test('새 파비콘을 못 찾으면 그대로 둔다', async () => {
  const { calls, done } = run({ icon_type: 'auto', url: 'https://omm.vercel.app', icon_url: 'https://omm.dshs.dev/icon.png' }, null)
  assert.equal(await done, false)
  assert.deepEqual(calls, ['resolve:https://omm.vercel.app'])
})
