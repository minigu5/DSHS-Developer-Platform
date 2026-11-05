// 관리자 화면에서 사람을 부르는 이름 — 닉네임과 실명이 다르면 둘 다(누구인지 바로 알아보게)

export type PersonNames = { nickname: string | null; full_name: string | null }

export function personLabel(u: PersonNames | null | undefined): string {
  if (!u) return '탈퇴한 사람'
  const nick = u.nickname?.trim()
  const real = u.full_name?.trim()
  if (nick && real && nick !== real) return `${nick} (${real})`
  return nick || real || '이름 없음'
}
