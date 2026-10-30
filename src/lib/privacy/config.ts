// 개인정보 처리방침 설정. 순수 상수만 — 미들웨어(edge)·서버·클라이언트 어디서든 import 한다.
// 처리방침 버전은 여기 없다: 본문(policy.ts)에서 자동으로 만든다(version.ts).

/** 동의 확인 결과 캐시 쿠키(값 = 동의한 버전). 미들웨어가 DB 에서 확인한 뒤 심고, 본문이 바뀌어 버전이 달라지면 자동으로 무효. */
export const PRIVACY_COOKIE = 'ds_privacy'
export const PRIVACY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
// httpOnly 가 아니다: 클라이언트(PrivacyGate)가 읽고 확인 요청을 건너뛴다. 버전 문자열뿐이라 민감하지 않다.
export const PRIVACY_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: PRIVACY_COOKIE_MAX_AGE,
  path: '/',
}

/** 개인정보 보호책임자 문의처 — policy.ts 와 화면이 같이 쓴다. */
export const PRIVACY_CONTACT_EMAIL = 'seong381400@gmail.com'

/** 철회(탈퇴) 확인 입력칸에 직접 쳐야 하는 말 */
export const WITHDRAW_CONFIRM_TEXT = '탈퇴'
