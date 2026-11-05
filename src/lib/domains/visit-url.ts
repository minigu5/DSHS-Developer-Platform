// "웹사이트 방문"(/api/track)이 실제로 보낼 주소 — 방문 주소가 아직 연결이 안 끝난 <이름>.dshs.dev면 원래 사이트로.
// 연결 전 주소는 자리표시(dshs.dev/pending-domain/<이름>)로 넘어가서, 방문하는 사람에게는 그냥 dshs.dev가 열렸다.

import { dshsAddressOf } from './hosts.ts'

export type VisitDomainRow = {
  status: string
  previous_url: string | null
  site_url: string | null
}

/** 방문 주소가 <이름>.dshs.dev(바로 아래 한 단계)면 그 이름 */
export function dshsNameOf(projectUrl: string): string | null {
  const hostname = dshsAddressOf(projectUrl)
  if (!hostname) return null
  const name = hostname.slice(0, -'.dshs.dev'.length)
  return name && !name.includes('.') ? name : null
}

function httpUrl(raw: string | null): string | null {
  const v = raw?.trim()
  if (!v) return null
  try {
    const u = new URL(v)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    // 되돌아갈 곳이 또 dshs.dev 주소면 같은 문제라 쓰지 않는다
    if (dshsAddressOf(v)) return null
    return v
  } catch {
    return null
  }
}

/**
 * row = 이 프로젝트의 살아 있는 주소(이름이 방문 주소와 같은 것). 없거나 연결됨(active)이면 방문 주소 그대로.
 * 설정 중·끊김이면 "바꾸기" 전 주소(previous_url) → ② 에 적은 원래 주소(site_url) 순서로, 둘 다 없으면 그대로.
 */
export function visitUrlFor(projectUrl: string, row: VisitDomainRow | null): string {
  if (!row || row.status === 'active') return projectUrl
  return httpUrl(row.previous_url) ?? httpUrl(row.site_url) ?? projectUrl
}
