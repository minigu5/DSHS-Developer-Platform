// 쿠키로 로그인을 확인하는 Route Handler 의 같은 출처 검사.
// 학생 주소(*.dshs.dev)는 dshs.dev 와 same-site 라 SameSite=Lax 쿠키가 그대로 실려 온다 —
// 상태를 바꾸는 요청은 Origin(없으면 Referer)이 이 사이트인지 직접 확인해야 한다.
// 서버 액션은 Next 가 Origin 을 검사하므로 여기 해당하지 않는다.

function originOf(raw: string | null): string | null {
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

// allowed: 이 요청을 받은 주소의 origin + NEXT_PUBLIC_SITE_URL (옛 vercel.app 주소도 운영 중이라 둘 다)
export function isSameOrigin(headers: Headers, allowed: string[]): boolean {
  const from = originOf(headers.get('origin')) ?? originOf(headers.get('referer'))
  if (!from) return false
  return allowed.some((a) => originOf(a) === from)
}
