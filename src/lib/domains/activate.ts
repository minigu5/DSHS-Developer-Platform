// 우리가 302 로 보내는 주소 만들기(proxied AAAA + Bulk Redirect 목록 항목) — 두 가지 쓰임:
//   - 자리표시(createPlaceholder): 예약 직후 <이름>.dshs.dev → dshs.dev/pending-domain/<이름> 경고 페이지.
//     소유 확인 전에는 주소가 학생 사이트로 열리지 않게 한다(설계 docs/superpowers/specs/2026-10-26-domain-verify-first-design.md).
//   - 바로가기(activateRedirect): Workers·Firebase 호스트. ② 소유 확인이 끝난 뒤 ③ 연결하기에서만 만든다
//     (확인 전에 만들면 남의 workers.dev·web.app 사이트로 보내는 주소를 누구나 만들 수 있다).
// 순서: proxied AAAA → 목록 항목 → DB 기록. 어디서든 실패하면 이번에 만든 것을 지우고 원래 오류를 던진다.
// AAAA 가 먼저인 이유: 목록은 같은 source 를 덮어쓰지만, 같은 AAAA 는 Cloudflare 가 거절한다(81058, 2026-10-26 실측) —
// 그래서 동시에 두 번 만들어도 늦은 쪽은 AAAA 에서 멈추고 앞선 쪽의 목록 항목을 건드리지 않는다.

import type { DnsClient } from './cloudflare.ts'
import { REDIRECT_ID_PREFIX, removeCloudflareWith } from './cleanup.ts'
import { isRedirectHost, type HostKey } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'
import type { RedirectClient } from './redirects.ts'

// 바로가기 전용 자리표시 주소 — 요청은 Cloudflare 가 바로가기로 응답해 여기까지 오지 않는다
const REDIRECT_PLACEHOLDER_AAAA = '100::'

export const PLACEHOLDER_PATH = '/pending-domain/'

/** 확인 전 주소가 보내는 경고 페이지 */
export function placeholderTarget(name: string): string {
  return `https://${ROOT_DOMAIN}${PLACEHOLDER_PATH}${name}`
}

export type ActivateDeps = {
  dns: DnsClient
  redirects: () => RedirectClient
  /** 만든 id 를 DB 에 남긴다 — 자리표시는 subdomain_set_placeholder_records, 바로가기는 subdomain_connect */
  setRecords: (ids: string[]) => Promise<void>
}

/** 연결 확인 결과를 "연결됨"으로 쳐도 되는가 — 바로가기 행은 목록 항목이 있어야 실제로 넘어간다 */
export function connectionLive(row: { host: HostKey | null; cf_record_ids: string[] }): boolean {
  if (row.host === null) return false
  return !isRedirectHost(row.host) || row.cf_record_ids.some((id) => id.startsWith(REDIRECT_ID_PREFIX))
}

async function createRedirectRecords(
  deps: ActivateDeps,
  row: { id: string; name: string },
  item: { target: string; keepPath?: boolean },
): Promise<void> {
  const fqdn = `${row.name}.${ROOT_DOMAIN}`
  // 목록 설정이 없으면 DNS 를 만들었다 지우는 일 없이 바로 실패한다
  const redirects = deps.redirects()
  const made: string[] = []
  try {
    made.push(...(await deps.dns.create([{ type: 'AAAA', name: fqdn, content: REDIRECT_PLACEHOLDER_AAAA }], row.id)))
    const itemId = await redirects.add({ source: `${fqdn}/`, ...item }, row.id)
    made.push(REDIRECT_ID_PREFIX + itemId)
    await deps.setRecords(made)
  } catch (e) {
    // 지우기마저 실패해 남은 것은 매일 점검이 찌꺼기(strayIds)로 찾아 지운다
    await removeCloudflareWith(made, deps).catch(() => {})
    throw e
  }
}

export function activateRedirect(deps: ActivateDeps, row: { id: string; name: string; target: string }): Promise<void> {
  return createRedirectRecords(deps, row, { target: `https://${row.target}/` })
}

export function createPlaceholder(deps: ActivateDeps, row: { id: string; name: string }): Promise<void> {
  return createRedirectRecords(deps, row, { target: placeholderTarget(row.name), keepPath: false })
}
