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
