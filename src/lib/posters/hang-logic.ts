// 포스터 상세 표시·빈 칸·"내 포스터 올리기" 길의 판단만 모은 순수 함수 — node:test 로 검증한다.
// 설계: docs/superpowers/specs/2026-11-07-poster-placement-promo-design.md

/** 공개 프로젝트에만 — 비공개 허용 사용자에게도 안 보인다. 비공개로 바뀌어도 지우지 않고 숨김 */
export function showcaseVisible(p: { visibility: string; poster_image_url: string | null }): boolean {
  return p.visibility === 'public' && !!p.poster_image_url
}

/** 상세 옆칸의 빈 포스터 칸 — 주인·팀원에게만(관리자 계정은 남의 프로젝트마다 뜨면 거슬려서 뺀다), 공개·걸린 포스터 없음 */
export function posterSlotVisible(i: { isOwnerOrTeam: boolean; isPublic: boolean; hasHungPoster: boolean }): boolean {
  return i.isOwnerOrTeam && i.isPublic && !i.hasHungPoster
}

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/

/**
 * 걸린 포스터를 보여 줄 크기로 줄인 Cloudinary 주소 — 원본(올린 그림 최대 10MB)을 그대로 받으면
 * 옆칸 하나에 몇 MB 씩 든다. 카드는 640, 크게 보기는 1600 정도. 우리 Cloudinary 가 아니면 그대로.
 */
export function posterImageAt(url: string, width: number): string {
  return url.replace(CLOUDINARY_UPLOAD, `$1c_limit,w_${width},f_auto,q_auto/`)
}

/** 크게 보기 창의 "내 프로젝트로도 올릴 수 있어요" 도착점 — 고칠 수 있는 공개 프로젝트 수로 정한다 */
export function posterStartTarget(projectIds: string[]): { kind: 'new' } | { kind: 'one'; id: string } | { kind: 'choose' } {
  if (projectIds.length === 0) return { kind: 'new' }
  if (projectIds.length === 1) return { kind: 'one', id: projectIds[0] }
  return { kind: 'choose' }
}
