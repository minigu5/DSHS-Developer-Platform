import 'server-only'

import { POSTER_TEXT_MODELS } from './config'
import { classifyGeminiResponse } from './decide'
import { POSTER_SYSTEM, type GeminiContent } from './prompt'

// 실험상 1회 80~90초. 넉넉히 잡되 끝없이 기다리지는 않는다
const TIMEOUT_MS = 150_000

interface GeminiReply {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

/** 한 번에 받는 generateContent — 스트림 조각을 파싱하면 Workers 무료 CPU(10ms)를 쓴다. 503·404면 다음 모델. */
export async function generatePosterReply(
  contents: GeminiContent[],
): Promise<{ ok: true; text: string } | { ok: false; reason: 'busy' | 'blocked' | 'error' }> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { ok: false, reason: 'error' }
  for (const model of POSTER_TEXT_MODELS) {
    let status: number
    let body: unknown
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: POSTER_SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 16000 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      status = res.status
      body = await res.json().catch(() => ({}))
    } catch {
      return { ok: false, reason: 'busy' }
    }
    const kind = classifyGeminiResponse(status, body)
    if (kind === 'next-model') continue
    if (kind !== 'ok') return { ok: false, reason: kind }
    const text = ((body as GeminiReply).candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
    return { ok: true, text }
  }
  return { ok: false, reason: 'busy' }
}
