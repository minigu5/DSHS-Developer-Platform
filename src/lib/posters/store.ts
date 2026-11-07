// 포스터 상태 바꾸기(저장 전 계산) — 순수 함수. 버전 5개·대화 10개만 남긴다.

import {
  POSTER_MESSAGES_KEPT,
  POSTER_VERSIONS_KEPT,
  type PosterArtOrder,
  type PosterMessage,
  type PosterBandPosition,
  type PosterTone,
  type PosterVersion,
} from './config.ts'

export interface PosterView {
  id: string
  projectId: string
  html: string | null
  artUrl: string | null
  tone: PosterTone
  position: PosterBandPosition
  messages: PosterMessage[]
  canUndo: boolean
  canRedraw: boolean
  // 학교 Mac 이 그림을 그리는 중(project_posters.art_job_id 가 있음)
  artPending: boolean
  // 큐에서 돌고 있는 만들기·고치기·다시 그리기 일감(project_posters.ai_job_id) — 다시 열어도 "만드는 중"을 이어서 보여 준다
  aiJobId: string | null
  // PNG·PDF 에 쓰는 AI 확대 그림 주소 — 스튜디오가 열릴 때 미리 한 번 불러 만들어 둔다(처음 만들 때 ~10초)
  artPrintUrl: string | null
  updatedAt: string
}

export interface PosterState {
  html: string | null
  art_url: string | null
  art_order: PosterArtOrder | null
  // 기다리는 Mac 그림 일감. 새 상태를 만들면 기본은 비운다(주문을 새로 넣을 때만 artJobId 로 싣는다)
  art_job_id: string | null
  versions: PosterVersion[]
  messages: PosterMessage[]
}

export function nextPosterState(
  prev: PosterState,
  change: { html: string; artUrl: string | null; artOrder: PosterArtOrder | null; artJobId?: string | null; userText: string; modelText: string; now: string },
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
    art_job_id: change.artJobId ?? null,
    versions,
    messages: [...prev.messages, ...added].slice(-POSTER_MESSAGES_KEPT),
  }
}

export function undoPosterState(prev: PosterState): PosterState | null {
  const last = prev.versions.at(-1)
  if (!last) return null
  return { ...prev, html: last.html, art_url: last.artUrl, art_order: last.artOrder, art_job_id: null, versions: prev.versions.slice(0, -1) }
}
