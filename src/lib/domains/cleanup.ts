// 주소의 Cloudflare 흔적 지우기 — 반납·회수·재연결·프로젝트 삭제·탈퇴·매일 점검이 같이 쓴다.
// cf_record_ids 에는 DNS 레코드 id 와, 바로가기 주소면 목록 항목 id 가 `redirect:<id>` 로 함께 들어 있다
// (DB 함수가 이미 이 배열을 돌려주므로 반환형을 바꾸지 않으려고 접두어로 나눴다).

import { getDnsClient, type DnsClient } from './cloudflare.ts'
import { getRedirectClient, type RedirectClient } from './redirects.ts'

export const REDIRECT_ID_PREFIX = 'redirect:'

export function splitCloudflareIds(ids: string[]): { dns: string[]; redirect: string[] } {
  const dns: string[] = []
  const redirect: string[] = []
  for (const id of ids) {
    if (id.startsWith(REDIRECT_ID_PREFIX)) redirect.push(id.slice(REDIRECT_ID_PREFIX.length))
    else dns.push(id)
  }
  return { dns, redirect }
}

/** 둘 다 시도하고, 하나라도 실패하면 마지막에 던진다. 목록 클라이언트는 지울 항목이 있을 때만 만든다 */
export async function removeCloudflareWith(ids: string[], deps: { dns: DnsClient; redirects: () => RedirectClient }): Promise<void> {
  const { dns, redirect } = splitCloudflareIds(ids)
  let failure: unknown = null
  if (dns.length) await deps.dns.remove(dns).catch((e) => (failure = e))
  if (redirect.length) {
    try {
      await deps.redirects().remove(redirect)
    } catch (e) {
      failure ??= e
    }
  }
  if (failure) throw failure
}

export function removeCloudflare(ids: string[]): Promise<void> {
  return removeCloudflareWith(ids, { dns: getDnsClient(), redirects: getRedirectClient })
}
