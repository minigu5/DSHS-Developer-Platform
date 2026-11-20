// 포스터 기능의 판단만 모은 순수 함수 — 네트워크·DB 없이 node:test 로 검증한다.

export interface AccessInput {
  loggedIn: boolean
  isAdmin: boolean
  isOwner: boolean
  isTeamMember: boolean
  isPublic: boolean
  banned: boolean
}

/** 포스터 올리기·걸기·띠 받기 — 수정할 수 있는 사람이면 누구나(소유자·팀원·관리자). */
export function decideBandAccess(i: AccessInput): 'ok' | 'login' | 'forbidden' | 'not_found' {
  if (!i.loggedIn) return 'login'
  if (i.banned) return 'forbidden'
  // 비공개 프로젝트는 QR 이 외부인에게 404 라 띠·포스터가 쓸모없다(설계 §10-1). 포스터는 지우지 않고 숨김
  if (!i.isPublic) return 'not_found'
  if (!(i.isAdmin || i.isOwner || i.isTeamMember)) return 'forbidden'
  return 'ok'
}
