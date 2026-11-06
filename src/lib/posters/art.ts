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
 * 학교 Mac 이 올린 그림 바이트를 Cloudinary 에 그대로 넘기고 URL.
 * base64 로 바꾸지 않는다(Workers CPU 10ms) — Blob 을 FormData 에 넣어 REST 업로드, 서명만 Worker 에서.
 */
export async function uploadPosterArtBlob(body: Blob): Promise<string | null> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !apiKey || !secret) return null
  // drawPosterArt 의 transformation 과 같은 변환
  const params = { folder: 'dshs/posters', timestamp: Math.round(Date.now() / 1000), transformation: 'f_auto,q_auto:good' }
  const form = new FormData()
  form.append('file', body)
  form.append('api_key', apiKey)
  form.append('signature', cloudinary.utils.api_sign_request(params, secret))
  for (const [key, value] of Object.entries(params)) form.append(key, String(value))
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form })
    if (!res.ok) {
      console.error('[poster] art 업로드 실패', res.status)
      return null
    }
    const uploaded = (await res.json()) as { secure_url?: string }
    return uploaded.secure_url ?? null
  } catch (e) {
    console.error('[poster] art 업로드 실패', String(e).slice(0, 200))
    return null
  }
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
