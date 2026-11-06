// 새 포스터 하루 1개의 "하루"는 KST — DB 트리거의 (now() AT TIME ZONE 'Asia/Seoul')::date 와 같은 날짜 문자열
export function kstDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
}
