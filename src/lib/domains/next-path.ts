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

/** 등록 뒤 `next`(도메인 화면 등)로 돌아가도 되는가: 웹사이트일 때만(비공개도 주소를 받을 수 있다 — 2026-11-12). 다른 종류는 주소를 못 받으니 보통 등록 흐름으로 */
export function shouldFollowNext(next: string | null | undefined, project: { isWebsite: boolean }): boolean {
  return Boolean(next) && project.isWebsite
}

/** 대곽나루 서버 id — 허브가 정하는 8자리 16진수 */
export const NARU_SERVER_ID = /^[0-9a-f]{8}$/

export function naruServerIdOf(raw: string | undefined): string | null {
  return raw && NARU_SERVER_ID.test(raw) ? raw : null
}

/** `?host=naru` — 연결 방법 고르기(대곽나루/다른 호스트)가 새로고침에 사라지지 않게 주소에 남긴다 */
export function hostParamIsNaru(raw: string | undefined): boolean {
  return raw === 'naru'
}

/** 현재 쿼리(`?a=b`, 앞의 ? 는 있어도 없어도)에서 host=naru 만 넣거나 빼고 다시 만든다. 다른 쿼리는 그대로. 비면 빈 문자열 */
export function withHostParam(search: string, naru: boolean): string {
  const params = new URLSearchParams(search)
  if (naru) params.set('host', 'naru')
  else params.delete('host')
  const out = params.toString()
  return out ? `?${out}` : ''
}
