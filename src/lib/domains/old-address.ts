// 프로젝트 설명에 남은 옛 사이트 주소 찾기·바꾸기(2026-11-05 사용자 요청 — 도메인을 연결해 놓고 설명은 README 를 그대로 가져와
// "접속 주소: https://…web.app" 처럼 옛 주소가 남은 프로젝트가 많음). 상세 페이지가 소유자에게 묻고, 서버 액션이 같은 함수로 바꾼다.

import { isRedirectHost, type DomainHost } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'

export type OldAddressSource = {
  name: string
  host: DomainHost | null
  target: string | null
  /** ② 소유 확인한 사이트 원래 주소 */
  siteUrl: string | null
  /** "바꾸기" 전 방문 주소 */
  previousUrl: string | null
}

/** 옛 주소 후보를 비교용 "호스트+경로" 접두어로 — 스킴·끝의 /·쿼리·해시는 뗀다. 긴 것부터(경로 있는 GitHub Pages 주소가 먼저 맞게) */
export function oldAddressPrefixes(src: OldAddressSource): string[] {
  const candidates = [src.siteUrl, src.previousUrl]
  // 바로가기는 target 이 곧 사이트 주소. 연결 호스트의 target 은 CNAME 값이거나(Vercel) 경로 없는 호스트라(GitHub Pages) 넣지 않는다
  if (src.target && isRedirectHost(src.host)) candidates.push(`https://${src.target}`)

  const out = new Set<string>()
  for (const raw of candidates) {
    if (!raw) continue
    let u: URL
    try {
      u = new URL(raw)
    } catch {
      continue
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') continue
    const host = u.hostname.toLowerCase()
    if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) continue
    out.add(host + u.pathname.replace(/\/+$/, ''))
  }
  return [...out].sort((a, b) => b.length - a.length)
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export type OldAddressFix = {
  text: string
  count: number
  /** 바뀌는 줄(앞뒤 공백 정리) — 확인용 */
  lines: { before: string; after: string }[]
}

/**
 * 설명 속 옛 주소를 `https://<이름>.dshs.dev` 로 바꾼다. 주소 뒤에 붙은 경로·해시는 그대로 둔다.
 * 다른 주소의 일부(`x.옛주소`, `옛주소2`, `옛주소.evil.com`)는 건드리지 않는다. 스킴 없이 적은 주소는 스킴 없이 바꾼다.
 */
export function fixOldAddresses(text: string, prefixes: string[], name: string): OldAddressFix {
  const fqdn = `${name}.${ROOT_DOMAIN}`
  let count = 0
  let out = text
  for (const prefix of prefixes) {
    const re = new RegExp(`(?<![A-Za-z0-9.\\-/@])(https?:\\/\\/)?${escape(prefix)}(?![A-Za-z0-9_-]|\\.[A-Za-z0-9])`, 'gi')
    out = out.replace(re, (_m, scheme: string | undefined) => {
      count++
      return scheme ? `https://${fqdn}` : fqdn
    })
  }
  if (count === 0) return { text, count: 0, lines: [] }

  // 바꾸기는 줄바꿈을 더하거나 빼지 않으므로 같은 번호의 줄끼리 비교하면 된다
  const before = text.split('\n')
  const after = out.split('\n')
  const lines = before.flatMap((line, i) => (line === after[i] ? [] : [{ before: line.trim(), after: after[i].trim() }]))
  return { text: out, count, lines }
}
