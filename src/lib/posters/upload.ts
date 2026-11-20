import 'server-only'

import { cloudinary } from '@/lib/cloudinary'

const startsWith = (head: Uint8Array, bytes: number[], at = 0) => bytes.every((b, i) => head[at + i] === b)

/** 첫 바이트로 실제 이미지 형식 확인 — Content-Type 만 믿지 않는다 */
export function sniffImageType(head: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

/**
 * 올린 포스터 그림 바이트를 Cloudinary dshs/posters 에 그대로 넘기고 URL.
 * base64 로 바꾸지 않는다(Workers CPU 10ms) — Blob 을 FormData 에 넣어 REST 업로드, 서명만 Worker 에서.
 */
export async function uploadPosterImage(body: Blob): Promise<string | null> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !apiKey || !secret) return null
  const params = { folder: 'dshs/posters', timestamp: Math.round(Date.now() / 1000), transformation: 'f_auto,q_auto:good' }
  const form = new FormData()
  form.append('file', body)
  form.append('api_key', apiKey)
  form.append('signature', cloudinary.utils.api_sign_request(params, secret))
  for (const [key, value] of Object.entries(params)) form.append(key, String(value))
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form })
    if (!res.ok) {
      console.error('[poster] 업로드 실패', res.status)
      return null
    }
    const uploaded = (await res.json()) as { secure_url?: string }
    return uploaded.secure_url ?? null
  } catch (e) {
    console.error('[poster] 업로드 실패', String(e).slice(0, 200))
    return null
  }
}
