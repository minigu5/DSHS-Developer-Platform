// 바로가기 켜기: 소유 확인 토큰이 보낼 곳 사이트에서 처음 확인됐을 때만 부른다(연결 확인 서버 액션·매일 점검).
// 확인 전에 켜 두면 남의 workers.dev·web.app 사이트로 보내는 주소를 누구나 만들 수 있어서다.
// 순서: proxied AAAA → 목록 항목 → DB 기록. 어디서든 실패하면 이번에 만든 것을 지우고 원래 오류를 던진다.
// AAAA 가 먼저인 이유: 목록은 같은 source 를 덮어쓰지만, 같은 AAAA 는 Cloudflare 가 거절한다(81058, 2026-10-26 실측) —
// 그래서 동시에 두 번 켜도 늦은 쪽은 AAAA 에서 멈추고 앞선 쪽의 목록 항목을 건드리지 않는다.
// 설계: docs/superpowers/specs/2026-10-26-subdomain-redirects-design.md 4.5

import type { DnsClient } from './cloudflare.ts'
import { REDIRECT_ID_PREFIX, removeCloudflareWith } from './cleanup.ts'
import { isRedirectHost, type HostKey } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'
import type { RedirectClient } from './redirects.ts'

// 바로가기 전용 자리표시 주소 — 요청은 Cloudflare 가 바로가기로 응답해 여기까지 오지 않는다
const REDIRECT_PLACEHOLDER_AAAA = '100::'

export type ActivateDeps = {
  dns: DnsClient
  redirects: () => RedirectClient
  /** subdomain_set_redirect_records — 이미 기록이 있으면 records_exist 로 실패한다 */
  setRecords: (ids: string[]) => Promise<void>
}

export function needsActivation(row: { host: HostKey | null; cf_record_ids: string[] }): boolean {
  return isRedirectHost(row.host) && !row.cf_record_ids.some((id) => id.startsWith(REDIRECT_ID_PREFIX))
}

export async function activateRedirect(deps: ActivateDeps, row: { id: string; name: string; target: string }): Promise<void> {
  const fqdn = `${row.name}.${ROOT_DOMAIN}`
  // 목록 설정이 없으면 DNS 를 만들었다 지우는 일 없이 바로 실패한다
  const redirects = deps.redirects()
  const made: string[] = []
  try {
    made.push(...(await deps.dns.create([{ type: 'AAAA', name: fqdn, content: REDIRECT_PLACEHOLDER_AAAA }], row.id)))
    const itemId = await redirects.add({ source: `${fqdn}/`, target: `https://${row.target}/` }, row.id)
    made.push(REDIRECT_ID_PREFIX + itemId)
    await deps.setRecords(made)
  } catch (e) {
    // 지우기마저 실패해 남은 것은 매일 점검이 찌꺼기(strayIds)로 찾아 지운다
    await removeCloudflareWith(made, deps).catch(() => {})
    throw e
  }
}
