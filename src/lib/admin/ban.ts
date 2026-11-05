// 차단 기간 계산과 차단된 사람에게 보일 문구. 차단은 등록·수정만 막는다(사용자 결정) — 실제로 막는 건 DB 트리거(user_banned).

export type BanDuration = '1d' | '7d' | '30d' | 'forever'

export const BAN_DURATIONS: { value: BanDuration; label: string }[] = [
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'forever', label: '무제한' },
]

const DAYS: Record<Exclude<BanDuration, 'forever'>, number> = { '1d': 1, '7d': 7, '30d': 30 }

/** 끝나는 시각. 무제한이면 null */
export function banUntil(d: BanDuration, now: Date): Date | null {
  if (d === 'forever') return null
  return new Date(now.getTime() + DAYS[d] * 86_400_000)
}

const KST_OFFSET_MS = 9 * 3_600_000

export function banNotice(until: string | null): string {
  if (until === null) return '관리자가 풀 때까지 글을 쓸 수 없어요.'
  const kst = new Date(new Date(until).getTime() + KST_OFFSET_MS)
  const minutes = kst.getUTCMinutes()
  const time = `${kst.getUTCHours()}시${minutes ? ` ${minutes}분` : ''}`
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${time}까지 글을 쓸 수 없어요.`
}

/** DB 가 차단으로 거절한 오류면 안내 문구, 아니면 null */
export function friendlyWriteError(message: string, until?: string | null): string | null {
  return message.includes('user_banned') ? banNotice(until ?? null) : null
}
