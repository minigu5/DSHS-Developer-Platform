import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { shrinkWithSharp } from './icon-fit-shrink-node.ts'

async function png(size: number): Promise<Uint8Array> {
  const buf = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 20, g: 120, b: 200, alpha: 1 } } })
    .png()
    .toBuffer()
  return new Uint8Array(buf)
}

test('큰 아이콘은 64px 안으로 줄인 PNG', async () => {
  const out = await shrinkWithSharp(await png(180))
  assert.ok(out)
  const meta = await sharp(out).metadata()
  assert.equal(meta.format, 'png')
  assert.ok(meta.width! <= 64 && meta.height! <= 64)
})

test('작은 아이콘은 키우지 않는다', async () => {
  const out = await shrinkWithSharp(await png(32))
  const meta = await sharp(out!).metadata()
  assert.equal(meta.width, 32)
})

test('깨진 바이트는 null', async () => {
  assert.equal(await shrinkWithSharp(new Uint8Array([1, 2, 3, 4])), null)
})
