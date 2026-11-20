// Workers(서버 액션·매일 파비콘 동기화)에서 아이콘 맞춤값을 만들 때 — 그림을 IMAGES 바인딩으로 64px로 줄여서 살핀다.
// 무료 요금제 CPU 10ms 안에 들려고(180px를 그대로 풀면 처음 한 번 20~30ms). 바인딩이 없으면(로컬 dev 등) 128px 이하만 그대로 푼다.

import { getCloudflareContext } from '@opennextjs/cloudflare'

import { computeIconFit } from '@/lib/icon-fit-fetch'
import type { IconFit } from '@/lib/icon-fit'

interface ImagesBinding {
  input(stream: ReadableStream<Uint8Array>): {
    transform(t: { width: number; height: number; fit: 'scale-down' }): {
      output(o: { format: 'image/png' }): Promise<{ response(): Response }>
    }
  }
}

async function shrinkWithImages(png: Uint8Array): Promise<Uint8Array | null> {
  let images: ImagesBinding | undefined
  try {
    images = (getCloudflareContext().env as unknown as { IMAGES?: ImagesBinding }).IMAGES
  } catch {
    return null
  }
  if (!images) return null
  const out = await images
    .input(new Blob([png as BlobPart]).stream())
    .transform({ width: 64, height: 64, fit: 'scale-down' })
    .output({ format: 'image/png' })
  return new Uint8Array(await out.response().arrayBuffer())
}

export function computeIconFitInWorker(src: string): Promise<IconFit | null> {
  return computeIconFit(src, { shrink: shrinkWithImages, maxPixels: 128 * 128 })
}
