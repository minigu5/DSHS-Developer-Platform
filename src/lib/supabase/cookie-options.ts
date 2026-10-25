// Supabase 세션 쿠키 이름·옵션. 서버·브라우저·미들웨어 세 클라이언트가 반드시 같은 값을 쓴다.
//
// 운영은 `__Host-` 접두사: 브라우저가 Domain 속성 없는 Secure·Path=/ 쿠키로만 받으므로
// 학생 주소(*.dshs.dev)의 JS 가 `Domain=.dshs.dev` 로 같은 이름을 심어 로그인을 덮을 수 없다(쿠키 투척 방어).
// 개발(http://localhost)은 Secure 를 못 쓰는 브라우저가 있어 접두사 없이.
// 설계: docs/superpowers/specs/2026-10-25-subdomain-lending-design.md 8절

const isProduction = process.env.NODE_ENV === 'production'

export const AUTH_COOKIE_OPTIONS = isProduction
  ? { name: '__Host-sb-auth', secure: true, path: '/', sameSite: 'lax' as const }
  : { name: 'sb-dev-auth', path: '/', sameSite: 'lax' as const }

// 온보딩 완료 캐시 쿠키(src/middleware.ts)
export const ONBOARDING_COOKIE_NAME = isProduction ? '__Host-ds_onboarded' : 'ds_onboarded'
export const ONBOARDING_COOKIE_SECURE = isProduction
