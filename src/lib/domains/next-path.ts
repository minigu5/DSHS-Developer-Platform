// 프로젝트 등록 뒤 돌아갈 곳(?next=) — 도메인 마련하기(/domains…) 안쪽 경로만 받는다(열린 리다이렉트 방지).
// //evil.com · https://… · /\evil.com · 제어문자는 모두 거절하고, 통과한 값은 같은 사이트의 /domains 경로다.

const DOMAINS_PATH = /^\/domains(?:[/?#]|$)/

export function safeDomainsNext(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return null
  if (!DOMAINS_PATH.test(raw)) return null
  if (raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return null
  try {
    const u = new URL(raw, 'https://dshs.invalid')
    if (u.origin !== 'https://dshs.invalid') return null
  } catch {
    return null
  }
  return raw
}

/** 돌아갈 주소에 방금 등록한 프로젝트 id 를 붙인다(`&project=` 또는 `?project=`) */
export function withProject(next: string, projectId: string): string {
  return `${next}${next.includes('?') ? '&' : '?'}project=${encodeURIComponent(projectId)}`
}

/** 대곽나루 서버 id — 허브가 정하는 8자리 16진수 */
export const NARU_SERVER_ID = /^[0-9a-f]{8}$/

export function naruServerIdOf(raw: string | undefined): string | null {
  return raw && NARU_SERVER_ID.test(raw) ? raw : null
}
