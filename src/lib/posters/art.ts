import 'server-only'

import { getCloudflareContext } from '@opennextjs/cloudflare'

import { cloudinary } from '@/lib/cloudinary'

import { fitArtSize } from './art-size'
import { POSTER_ART_MODEL, type PosterArtOrder } from './config'
import { classifyArtError } from './decide'

// cloudflare-env.d.ts 는 두지 않는다(CLAUDE.md) — 쓰는 바인딩만 적는다
interface AiEnv {
  AI: { run(model: string, input: unknown): Promise<{ image?: string }> }
}

/**
 * Workers AI(flux-2-klein)로 글자 없는 그림 한 장 → Cloudinary 에 올리고 URL.
 * 비율은 Gemini 가 정한 그림 자리 그대로, 넓이만 줄인다. base64 는 디코딩하지 않고 data URI 로 넘긴다(CPU 절약).
 */
export async function drawPosterArt(order: PosterArtOrder): Promise<{ ok: true; url: string } | { ok: false; reason: 'quota' | 'error' }> {
  const { width, height } = fitArtSize(order.width, order.height)
  try {
    const form = new FormData()
    form.append('prompt', order.prompt)
    form.append('width', String(width))
    form.append('height', String(height))
    const packed = new Response(form)
    const { env } = getCloudflareContext()
    const out = await (env as unknown as AiEnv).AI.run(POSTER_ART_MODEL, {
      multipart: { body: packed.body, contentType: packed.headers.get('content-type') },
    })
    if (!out?.image) return { ok: false, reason: 'error' }
    const uploaded = await cloudinary.uploader.upload(`data:image/png;base64,${out.image}`, {
      folder: 'dshs/posters',
      resource_type: 'image',
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
    })
    return { ok: true, url: uploaded.secure_url }
  } catch (e) {
    console.error('[poster] art 실패', String(e).slice(0, 200))
    return { ok: false, reason: classifyArtError(String(e)) }
  }
}
