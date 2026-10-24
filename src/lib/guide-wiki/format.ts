/**
 * "버전 N" 뒤에 붙는 조사 "로/으로". 숫자를 한글로 읽은 마지막 소리로 정한다.
 * 일·이·사·오·칠·팔·구는 받침이 없거나 ㄹ 받침이라 "로", 영(십·백…)·삼·육은 "으로".
 */
export function versionRo(n: number): string {
  const last = Math.abs(n) % 10
  const eu = last === 0 || last === 3 || last === 6
  return `버전 ${n}${eu ? '으로' : '로'}`
}

const KST_FORMAT = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** 한국 시간 `yyyy-MM-dd HH:mm`. 서버 시간대와 상관없이 같은 값이 나온다. */
export function formatKst(iso: string): string {
  return KST_FORMAT.format(new Date(iso))
}
