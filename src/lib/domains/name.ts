// 주소 이름(<이름>.dshs.dev) 규칙. DB(supabase/migrations/*_subdomains.sql)에도 같은 규칙·예약어가 있다 — 바꾸면 둘 다.

export const ROOT_DOMAIN = 'dshs.dev'

// 사이트·메일·인증서에 쓰일 수 있거나 공식 주소로 오해될 이름
export const RESERVED_NAMES: readonly string[] = [
  'www', 'api', 'admin', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'ns', 'ns1', 'ns2', 'mx',
  'dev', 'staging', 'test', 'status', 'auth', 'login', 'static', 'assets', 'cdn', 'app',
  'docs', 'blog', 'domains', 'guide', 'tips', 'haejwo', 'explore', 'dshs', 'root',
  'support', 'help', 'security',
]

export type NameCheck = { ok: true } | { ok: false; reason: 'length' | 'chars' | 'reserved' | 'idn' }

export function normalizeName(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateName(name: string): NameCheck {
  if (name.length < 3 || name.length > 30) return { ok: false, reason: 'length' }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) return { ok: false, reason: 'chars' }
  // 한글 같은 이름을 바꾼 punycode — 모양이 비슷한 글자로 공식 주소를 흉내 낼 수 있어 막는다
  if (name.startsWith('xn--')) return { ok: false, reason: 'idn' }
  if (RESERVED_NAMES.includes(name)) return { ok: false, reason: 'reserved' }
  return { ok: true }
}
