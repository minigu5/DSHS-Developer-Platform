// 소유 확인: 학생 사이트가 그 주소 전용 토큰을 보여 주는지 확인한다.
// 연결 확인(서버 액션)과 매일 점검(scripts/check-subdomains.mts)이 같은 판정을 쓴다.
// 네트워크는 Fetcher 로 주입받는다(본문 256KB 자르기·타임아웃은 Fetcher 책임 — fetch-site.ts).

import { HOST_PRESETS, type HostKey } from './hosts.ts'

export const VERIFY_META_NAME = 'dshs-verify'
export const VERIFY_FILE_PATH = '/.well-known/dshs-verify.txt'
const MAX_REDIRECTS = 3

export type CheckResult =
  | { kind: 'ok' }
  | { kind: 'unreachable'; detail: string }
  | { kind: 'not_found_page' }
  | { kind: 'no_token' }

export type FetchedPage = { status: number; headers: Headers; body: string; location: string | null }
export type Fetcher = (url: string) => Promise<FetchedPage>

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return m ? (m[2] ?? m[3] ?? m[4] ?? null) : null
}

export function extractToken(html: string): string | null {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(tag, 'name')?.toLowerCase() === VERIFY_META_NAME) return attr(tag, 'content')?.trim() ?? null
  }
  return null
}

// 같은 호스트 안에서만 리다이렉트를 따라간다 — 다른 호스트로 보내는 사이트는 이 주소의 사이트로 보지 않는다
async function fetchSameHost(start: string, fetcher: Fetcher): Promise<FetchedPage | { error: string }> {
  let url = start
  const host = new URL(start).host
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let page: FetchedPage
    try {
      page = await fetcher(url)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'network' }
    }
    if (page.status < 300 || page.status >= 400) return page
    if (!page.location) return { error: `redirect ${page.status} without location` }
    let next: URL
    try {
      next = new URL(page.location, url)
    } catch {
      return { error: 'bad redirect' }
    }
    if (next.protocol !== 'https:' || next.host !== host) return { error: 'redirect to another host' }
    url = next.toString()
  }
  return { error: 'too many redirects' }
}

export async function checkSite(fqdn: string, token: string, host: HostKey, fetcher: Fetcher): Promise<CheckResult> {
  const root = await fetchSameHost(`https://${fqdn}/`, fetcher)
  if ('error' in root) return { kind: 'unreachable', detail: root.error }

  const ok2xx = root.status >= 200 && root.status < 300
  if (ok2xx && extractToken(root.body) === token) return { kind: 'ok' }

  const file = await fetchSameHost(`https://${fqdn}${VERIFY_FILE_PATH}`, fetcher)
  if (!('error' in file) && file.status >= 200 && file.status < 300 && file.body.trim() === token) return { kind: 'ok' }

  if (HOST_PRESETS[host].notFound(root.status, root.headers, root.body)) return { kind: 'not_found_page' }
  if (ok2xx) return { kind: 'no_token' }
  return { kind: 'unreachable', detail: `status ${root.status}` }
}
