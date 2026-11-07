// 방문 주소와 저장소 링크가 같은 곳을 가리키는지 — 같으면 상세 페이지에 버튼을 하나만 보인다.
// http/https·www.·대소문자(호스트)·끝 슬래시·.git·쿼리·해시 차이는 같은 주소로 본다.
function linkKey(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    const path = u.pathname.replace(/\/+$/, '').replace(/\.git$/i, '')
    return `${host}${path}`
  } catch {
    return null
  }
}

export function isSameLink(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ka = linkKey(a)
  return ka !== null && ka === linkKey(b)
}
