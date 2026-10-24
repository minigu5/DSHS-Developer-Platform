/** `?rev=` 같은 쿼리 값을 양의 정수로. 정규 표기의 양의 정수 문자열만 받는다. */
export function parseRevParam(v: string | string[] | undefined): number | null {
  if (typeof v !== 'string' || !/^[1-9]\d*$/.test(v)) return null
  const n = Number(v)
  return Number.isSafeInteger(n) ? n : null
}

/** `?from=` 돌아갈 경로. `/guide` 로 시작하는 사이트 내부 경로만 허용(오픈 리다이렉트 방지). */
export function safeFrom(v: string | string[] | undefined): string | null {
  if (typeof v !== 'string') return null
  if (!v.startsWith('/guide')) return null
  if (v.includes('//') || v.includes('\\') || v.includes('://')) return null
  return v
}
