// 포스터 상태 바꾸기(저장 전 계산) — 순수 함수. 버전 5개·대화 10개만 남긴다.

import {
  POSTER_MESSAGES_KEPT,
  POSTER_VERSIONS_KEPT,
  type PosterArtOrder,
  type PosterMessage,
  type PosterTone,
  type PosterVersion,
} from './config.ts'

export interface PosterView {
  id: string
  projectId: string
  html: string | null
  artUrl: string | null
  tone: PosterTone
  messages: PosterMessage[]
  canUndo: boolean
  canRedraw: boolean
  updatedAt: string
}

export interface PosterState {
  html: string | null
  art_url: string | null
  art_order: PosterArtOrder | null
  versions: PosterVersion[]
  messages: PosterMessage[]
}

export function nextPosterState(
  prev: PosterState,
  change: { html: string; artUrl: string | null; artOrder: PosterArtOrder | null; userText: string; modelText: string; now: string },
): PosterState & { html: string } {
  const versions = prev.html
    ? [...prev.versions, { html: prev.html, artUrl: prev.art_url, artOrder: prev.art_order, at: change.now }].slice(-POSTER_VERSIONS_KEPT)
    : prev.versions
  const added: PosterMessage[] = []
  if (change.userText.trim()) added.push({ role: 'user', text: change.userText.trim(), at: change.now })
  if (change.modelText) added.push({ role: 'model', text: change.modelText, at: change.now })
  return {
    html: change.html,
    art_url: change.artUrl,
    art_order: change.artOrder,
    versions,
    messages: [...prev.messages, ...added].slice(-POSTER_MESSAGES_KEPT),
  }
}

export function undoPosterState(prev: PosterState): PosterState | null {
  const last = prev.versions.at(-1)
  if (!last) return null
  return { ...prev, html: last.html, art_url: last.artUrl, art_order: last.artOrder, versions: prev.versions.slice(0, -1) }
}
