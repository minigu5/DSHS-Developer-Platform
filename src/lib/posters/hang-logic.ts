// 포스터 걸기·상세 표시·권유 카드·"내 포스터 만들기" 길의 판단만 모은 순수 함수 — node:test 로 검증한다.
// 설계: docs/superpowers/specs/2026-11-07-poster-placement-promo-design.md

import { hasArtSlot } from './sanitize.ts'

export type PosterKind = 'ai' | 'upload'

/**
 * 직접 올린 건 그림이 있어야, AI 는 HTML 이 있고 그림을 기다리지 않을 때만(그림 없는 PNG 가 걸리지 않게).
 * ART 자리가 있는데 그림도 일감도 없으면(그림 생성 실패) 빈 그림 자리로 걸리니 막는다.
 */
export function canHangPoster(p: {
  kind: PosterKind
  html: string | null
  art_url: string | null
  art_job_id: string | null
  image_url: string | null
}): boolean {
  if (p.kind === 'upload') return !!p.image_url
  if (!p.html || p.art_job_id) return false
  return !!p.art_url || !hasArtSlot(p.html)
}

/** 걸린 뒤 포스터를 고쳤으면 "다시 걸기"를 보인다(자동으로 다시 찍지 않음) */
export function hungIsStale(hungAt: string | null, posterUpdatedAt: string): boolean {
  if (!hungAt) return false
  return new Date(posterUpdatedAt).getTime() > new Date(hungAt).getTime()
}

// AI 포스터 PNG 는 걸기를 누른 뒤 뒤에서 찍는다(8~9초). Workers 는 응답 뒤 30초까지만 기다려 주니 넉넉히 2분 지나도 없으면 실패
export const HANG_RENDER_GIVE_UP_MS = 120_000

/** 걸린 포스터의 상태 — 그림 주소가 있으면 걸림, 없으면 찍는 중(2분 안) 또는 실패 */
export function hangState(p: { imageUrl: string | null; hungAt: string | null }, now: number): 'hung' | 'rendering' | 'failed' {
  if (p.imageUrl) return 'hung'
  if (!p.hungAt) return 'failed'
  return now - new Date(p.hungAt).getTime() < HANG_RENDER_GIVE_UP_MS ? 'rendering' : 'failed'
}

/** 공개 프로젝트에만 —비공개 허용 사용자에게도 안 보인다. 비공개로 바뀌어도 지우지 않고 숨김 */
export function showcaseVisible(p: { visibility: string; poster_image_url: string | null }): boolean {
  return p.visibility === 'public' && !!p.poster_image_url
}

/** 상세 옆칸의 빈 포스터 칸 — 주인·팀원에게만(관리자 계정은 남의 프로젝트마다 뜨면 거슬려서 뺀다), 공개·걸린 포스터 없음 */
export function posterSlotVisible(i: { isOwnerOrTeam: boolean; isPublic: boolean; hasHungPoster: boolean }): boolean {
  return i.isOwnerOrTeam && i.isPublic && !i.hasHungPoster
}

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/

/**
 * 걸린 포스터를 보여 줄 크기로 줄인 Cloudinary 주소 — 원본(올린 그림 최대 10MB, AI PNG 1240×1754)을 그대로 받으면
 * 옆칸 하나에 몇 MB 씩 든다. 카드는 640, 크게 보기는 1600 정도. 우리 Cloudinary 가 아니면 그대로.
 */
export function posterImageAt(url: string, width: number): string {
  return url.replace(CLOUDINARY_UPLOAD, `$1c_limit,w_${width},f_auto,q_auto/`)
}

/** 크게 보기 창의 "내 프로젝트로도 만들 수 있어요" 도착점 — 고칠 수 있는 공개 프로젝트 수로 정한다 */
export function posterStartTarget(projectIds: string[]): { kind: 'new' } | { kind: 'one'; id: string } | { kind: 'choose' } {
  if (projectIds.length === 0) return { kind: 'new' }
  if (projectIds.length === 1) return { kind: 'one', id: projectIds[0] }
  return { kind: 'choose' }
}
