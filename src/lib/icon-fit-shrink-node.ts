// 대곽나루 서버(Node)에서 아이콘 맞춤값을 살필 때 그림을 64px 안으로 줄인다 — Worker 의 IMAGES 바인딩 대신(icon-fit-worker.ts).
// sharp 는 Worker 묶음에 넣지 않으려고 nodeRequire 로 부른다.
import type Sharp from 'sharp'

import { nodeRequire } from './node-require.ts'

export async function shrinkWithSharp(png: Uint8Array): Promise<Uint8Array | null> {
  try {
    const sharp = await nodeRequire<typeof Sharp>('sharp')
    const out = await sharp(png).resize(64, 64, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    return new Uint8Array(out)
  } catch {
    return null
  }
}
