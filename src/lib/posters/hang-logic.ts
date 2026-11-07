// 포스터 걸기·상세 표시·권유 카드·"내 포스터 만들기" 길의 판단만 모은 순수 함수 — node:test 로 검증한다.
// 설계: docs/superpowers/specs/2026-11-07-poster-placement-promo-design.md

export type PosterKind = 'ai' | 'upload'

/** 직접 올린 건 그림이 있어야, AI 는 HTML 이 있고 그림을 기다리지 않을 때만(그림 없는 PNG 가 걸리지 않게) */
export function canHangPoster(p: { kind: PosterKind; html: string | null; art_job_id: string | null; image_url: string | null }): boolean {
  if (p.kind === 'upload') return !!p.image_url
  return !!p.html && !p.art_job_id
}

/** 걸린 뒤 포스터를 고쳤으면 "다시 걸기"를 보인다(자동으로 다시 찍지 않음) */
export function hungIsStale(hungAt: string | null, posterUpdatedAt: string): boolean {
  if (!hungAt) return false
  return new Date(posterUpdatedAt).getTime() > new Date(hungAt).getTime()
}

/** 공개 프로젝트에만 — 비공개 허용 사용자에게도 안 보인다. 비공개로 바뀌어도 지우지 않고 숨김 */
export function showcaseVisible(p: { visibility: string; poster_image_url: string | null }): boolean {
  return p.visibility === 'public' && !!p.poster_image_url
}

/** 주인에게만, 공개·걸린 포스터 없음, 다른 권유(미리보기 주소·옛 주소·도메인)가 이미 떠 있으면 안 띄운다 */
export function posterNudgeVisible(i: { isOwner: boolean; isPublic: boolean; hasHungPoster: boolean; otherNudgeShown: boolean }): boolean {
  return i.isOwner && i.isPublic && !i.hasHungPoster && !i.otherNudgeShown
}

/** 크게 보기 창의 "내 프로젝트로도 만들 수 있어요" 도착점 — 고칠 수 있는 공개 프로젝트 수로 정한다 */
export function posterStartTarget(projectIds: string[]): { kind: 'new' } | { kind: 'one'; id: string } | { kind: 'choose' } {
  if (projectIds.length === 0) return { kind: 'new' }
  if (projectIds.length === 1) return { kind: 'one', id: projectIds[0] }
  return { kind: 'choose' }
}
