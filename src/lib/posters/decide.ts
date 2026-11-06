// 포스터 기능의 판단만 모은 순수 함수 — 네트워크·DB 없이 node:test 로 검증한다.

import { posterAllowed, type PosterArtOrder } from './config.ts'
import { hasArtSlot } from './sanitize.ts'

export interface AccessInput {
  loggedIn: boolean
  isAdmin: boolean
  isOwner: boolean
  isTeamMember: boolean
  isPublic: boolean
  banned: boolean
}

/** 포스터 띠 받기 — 수정할 수 있는 사람이면 누구나(관리자 제한 없음, AI 를 안 쓴다). */
export function decideBandAccess(i: AccessInput): 'ok' | 'login' | 'forbidden' | 'not_found' {
  if (!i.loggedIn) return 'login'
  if (i.banned) return 'forbidden'
  // 비공개 프로젝트는 QR 이 외부인에게 404 라 띠·포스터가 쓸모없다(설계 §10-1). 포스터는 지우지 않고 숨김
  if (!i.isPublic) return 'not_found'
  if (!(i.isAdmin || i.isOwner || i.isTeamMember)) return 'forbidden'
  return 'ok'
}

/** AI 포스터 만들기 — 띠 받기 조건 + 1단계 관리자 전용 */
export function decidePosterAccess(i: AccessInput): 'ok' | 'login' | 'forbidden' | 'not_found' {
  const band = decideBandAccess(i)
  if (band !== 'ok') return band
  return posterAllowed(i.isAdmin) ? 'ok' : 'forbidden'
}

interface GeminiBody {
  promptFeedback?: { blockReason?: string }
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[]
}

export function classifyGeminiResponse(status: number, body: unknown): 'ok' | 'next-model' | 'busy' | 'blocked' | 'error' {
  if (status === 404 || status === 503) return 'next-model'
  if (status === 429) return 'busy'
  if (status !== 200) return 'error'
  const b = (body ?? {}) as GeminiBody
  if (b.promptFeedback?.blockReason) return 'blocked'
  const c = b.candidates?.[0]
  if (!c) return 'error'
  if (c.finishReason === 'SAFETY' || c.finishReason === 'PROHIBITED_CONTENT' || c.finishReason === 'BLOCKLIST') return 'blocked'
  return c.content?.parts?.some((p) => p.text) ? 'ok' : 'error'
}

export function classifyArtError(message: string): 'quota' | 'error' {
  return /daily free allocation|neurons|\b429\b|rate limit/i.test(message) ? 'quota' : 'error'
}

// 그림은 주문이 있고 HTML 에 ART 자리가 있을 때만 그린다 — 자리 없는 주문에 무료 할당량을 쓰지 않는다
export function planArtAction(i: { html: string; order: PosterArtOrder | null }): 'draw' | 'keep' {
  return i.order && hasArtSlot(i.html) ? 'draw' : 'keep'
}
