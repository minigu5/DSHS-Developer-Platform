// Gemini 응답 = ```json 그림 주문(선택) + ```html 포스터. 둘 다 없으면 null.

import type { PosterArtOrder } from './config.ts'

const MAX_ART_PROMPT = 1500

function readArt(text: string): PosterArtOrder | null {
  const fence = text.match(/```json\s*([\s\S]*?)```/i)
  if (!fence) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(fence[1])
  } catch {
    return null
  }
  const art = (parsed as { art?: unknown } | null)?.art as Record<string, unknown> | undefined
  if (!art) return null
  const { prompt, width, height } = art
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_ART_PROMPT) return null
  if (typeof width !== 'number' || typeof height !== 'number' || !(width > 0) || !(height > 0)) return null
  return { prompt: prompt.trim(), width, height }
}

function readHtml(text: string): string | null {
  const fence = text.match(/```html\s*([\s\S]*?)```/i)
  if (fence) return fence[1].trim() || null
  const doc = text.match(/<!doctype[\s\S]*<\/html>/i) ?? text.match(/<html[\s\S]*<\/html>/i)
  return doc ? doc[0] : null
}

export function parsePosterReply(text: string): { html: string | null; art: PosterArtOrder | null } {
  return { html: readHtml(text), art: readArt(text) }
}
