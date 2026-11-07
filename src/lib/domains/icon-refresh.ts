// 주소 반납·회수 뒤 "URL에서 자동 추출"(icon_type='auto') 아이콘을 되돌아간 방문 주소의 파비콘으로 다시 맞춘다.
// "바꾸기" 뒤 매일 밤 파비콘 동기화가 icon_url 을 https://<이름>.dshs.dev/… 로 바꿔 두는데, 반납(subdomain_restore_project_url)은
// 방문 주소·설명만 되돌려서 아이콘은 사라진 주소를 가리킨 채 남았다 → 기본 아이콘(첫 글자 타일)이 떴다.
// 반납하는 서버 액션(actions.ts·projects/release-domain.ts)과 매일 점검(scripts/check-subdomains.mts)이 같이 쓴다.
// 스크립트가 node로 바로 돌리므로 상대 경로 import, 네트워크·DB 는 주입받아 node:test 로 검증한다.

export type IconRow = { icon_type: string | null; url: string | null; icon_url: string | null }

export type IconRefreshDeps = {
  load: () => Promise<IconRow | null>
  /** 사이트에서 파비콘을 다시 찾는다(resolveFavicon) */
  resolve: (siteUrl: string) => Promise<string | null>
  update: (iconUrl: string) => Promise<void>
}

/**
 * 아이콘 주소가 <이름>.dshs.dev 를 가리키는지 — 파비콘 직접 주소와 공개 favicon 서비스(구글 ?domain=<이름>.dshs.dev, 덕덕고 /ip3/<이름>.dshs.dev.ico) 모두.
 * sub.<이름>.dshs.dev 도 같이 사라지니 포함, <이름>.dshs.dev.evil.com 같은 다른 주소는 뺀다.
 */
export function iconUsesAddress(iconUrl: string | null, name: string): boolean {
  if (!iconUrl) return false
  return new RegExp(`(^|[^a-z0-9-])${name}\\.dshs\\.dev(?![a-z0-9-]|\\.(?!ico(?:$|[?#]))[a-z0-9])`, 'i').test(iconUrl)
}

/** 바꿨으면 true. 사라진 주소를 가리키는 자동 아이콘만 건드리고, 새 파비콘을 못 찾으면 그대로 둔다(매일 밤 동기화가 다시 시도) */
export async function refreshAutoIconWith(name: string, deps: IconRefreshDeps): Promise<boolean> {
  const row = await deps.load()
  if (!row || row.icon_type !== 'auto' || !row.url || !iconUsesAddress(row.icon_url, name)) return false
  // 방문 주소가 아직 이 주소면(되돌릴 주소가 없어 비우지도 못한 경우 등) 다시 찾아도 같은 곳이다
  if (iconUsesAddress(row.url, name)) return false
  const next = await deps.resolve(row.url)
  if (!next || next === row.icon_url) return false
  await deps.update(next)
  return true
}
