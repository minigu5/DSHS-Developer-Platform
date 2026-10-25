// 개인정보 화면·탈퇴 처리에서 쓰는 순수 함수. node:test 로 검증한다(상대 .ts import 만 사용).

const KST_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** DB 의 UTC 시각(ISO) → "2026년 10월 25일 오후 2:03" (한국 시간). 날짜가 아니면 빈 문자열. */
export function formatKst(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : KST_FORMAT.format(d)
}

/**
 * 우리 Cloudinary 업로드 주소(`/api/upload` 가 `dshs` 폴더에 올린 것)에서 public_id 를 뽑는다.
 * 계정 이름이 다르거나 다른 폴더·호스트면 null — 탈퇴 때 남의 이미지를 지우지 않으려는 안전장치.
 */
export function cloudinaryPublicId(url: string, cloudName: string | undefined): string | null {
  if (!cloudName) return null
  const m = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:v\d+\/)?(dshs\/[A-Za-z0-9_-]+)\.[A-Za-z0-9]+$/.exec(url)
  return m && m[1] === cloudName ? m[2] : null
}

/** 글이 바뀌었는지만 알아내는 32비트 해시(FNV-1a) → 8자리 16진수. 보안용이 아니다. */
export function hashText(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * 처리방침 버전 = 시행일(`YYYY-MM-DD`) + 본문 해시. 본문을 고치면 시행일을 안 올려도 버전이 바뀌므로
 * 동의 기록(`privacy_consents.policy_version`)과 달라져 모두에게 동의 창이 다시 뜬다.
 */
export function policyVersion(effectiveDate: string, policyText: string): string {
  return `${effectiveDate}-${hashText(policyText)}`
}
