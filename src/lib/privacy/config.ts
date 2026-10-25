// 개인정보 처리방침 설정. 순수 상수만 — 미들웨어(edge)·서버·클라이언트 어디서든 import 한다.

/**
 * 처리방침 버전(시행일). policy.ts 의 문구를 실제로 바꿀 때 올린다 → 모든 사용자에게 동의 팝업이 다시 뜬다.
 * `privacy_consents.policy_version` 이 `YYYY-MM-DD` 형식만 받는다.
 */
export const PRIVACY_POLICY_VERSION = '2026-10-25'

/** 동의 확인 결과 캐시 쿠키(값 = 동의한 버전). 미들웨어가 DB 에서 확인한 뒤 심고, 버전이 바뀌면 자동으로 무효. */
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
export const PRIVACY_CONTACT_EMAIL = 'ts250024@ts.hs.kr'

/** 철회(탈퇴) 확인 입력칸에 직접 쳐야 하는 말 */
export const WITHDRAW_CONFIRM_TEXT = '탈퇴'
