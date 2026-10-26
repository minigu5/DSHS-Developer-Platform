// 매일 점검(scripts/check-subdomains.mts)의 판단 — 네트워크·DB 없이 node:test 로 검증한다.
//   - 소유 확인 토큰이 보이면 정상
//   - 연결됐던 주소가 7일 넘게 끊겨 있으면 반납(주인이 떠난 주소를 남이 가로채지 못하게)
//   - 한 번도 연결되지 않은 채 7일이 지나면 반납(이름만 묶어 두기 방지). 호스트에 연결했다면 그 시각(connected_at)부터 센다
//     — 6일째 확인하고 7일째 연결한 주소가 연결 직후 반납되지 않게

import { RECORD_COMMENT_PREFIX } from './cloudflare.ts'
import { placeholderTarget } from './activate.ts'
import type { CheckResult, FetchedPage } from './verify.ts'

export const RELEASE_AFTER_DAYS = 7
const DAY_MS = 86_400_000

export type CheckRow = {
  status: 'reserved' | 'pending' | 'active' | 'broken'
  created_at: string
  broken_since: string | null
  connected_at: string | null
  ever_active: boolean
}

export type Decision = { ok: boolean; release: null | 'broken_7d' | 'never_connected_7d' }

const olderThan = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime() > RELEASE_AFTER_DAYS * DAY_MS

/** result 가 null 이면 확인하지 않은 것(예약만 된 주소) */
export function decide(row: CheckRow, result: CheckResult | null, now: Date): Decision {
  if (result?.kind === 'ok') return { ok: true, release: null }
  if (!row.ever_active) {
    const since = row.connected_at && new Date(row.connected_at) > new Date(row.created_at) ? row.connected_at : row.created_at
    return { ok: false, release: olderThan(since, now) ? 'never_connected_7d' : null }
  }
  const since = row.broken_since ?? now.toISOString()
  return { ok: false, release: olderThan(since, now) ? 'broken_7d' : null }
}

// 막 만드는 중인 레코드(활성화·연결은 몇 초)를 지우지 않으려고, 살아 있는 행의 기록되지 않은 레코드는 이만큼 지난 것만 찌꺼기로 본다
export const STRAY_GRACE_MS = 60 * 60_000

/**
 * 지울 Cloudflare 레코드·목록 항목 id — comment 의 행이 살아 있지 않거나,
 * 살아 있는 행인데 그 행의 cf_record_ids 에 없고 STRAY_GRACE_MS 보다 오래된 것(시간 초과·탭 닫힘으로 남은 찌꺼기 —
 * 남겨 두면 같은 이름의 AAAA·목록 항목이 겹쳐 다시 만들기가 영영 실패한다).
 * recordedId: Cloudflare id → cf_record_ids 에 적히는 모양(목록 항목은 'redirect:' 접두어)
 */
export function strayIds(
  live: { id: string; cf_record_ids: string[] }[],
  managed: { id: string; comment: string; createdOn: string }[],
  recordedId: (id: string) => string,
  now: Date,
): string[] {
  const byRow = new Map(live.map((r) => [r.id, new Set(r.cf_record_ids)]))
  return managed
    .filter((m) => {
      const rowId = managedRowId(m.comment)
      const recorded = rowId ? byRow.get(rowId) : undefined
      if (!recorded) return true
      if (recorded.has(recordedId(m.id))) return false
      return now.getTime() - new Date(m.createdOn).getTime() > STRAY_GRACE_MS
    })
    .map((m) => m.id)
}

/** Cloudflare 레코드 comment("dshs-subdomain:<행 id>")에서 행 id */
export function managedRowId(comment: string): string | null {
  return comment.startsWith(RECORD_COMMENT_PREFIX) ? comment.slice(RECORD_COMMENT_PREFIX.length) || null : null
}

/** 바로가기 동작 점검: <이름>.dshs.dev 가 302 로 https://<target>/ 에 보내는가(계정에 하나뿐인 Bulk Redirect 규칙이 살아 있는가) */
export function redirectWorks(page: FetchedPage, target: string): boolean {
  return page.status === 302 && (page.location ?? '').startsWith(`https://${target}/`)
}

/** Cloudflare 가 이 요청을 보안 확인("Just a moment…")으로 막았나 — 점검하는 서버(GitHub Actions 의 데이터센터 IP)가 막힌 것이라 규칙이 죽었는지는 알 수 없다 */
export function blockedByChallenge(page: FetchedPage): boolean {
  return page.status === 403 && page.headers.get('cf-mitigated') === 'challenge'
}

/** 자리표시 동작 점검: 확인 전 <이름>.dshs.dev 가 302 로 경고 페이지에 보내는가 */
export function placeholderWorks(page: FetchedPage, name: string): boolean {
  return page.status === 302 && page.location === placeholderTarget(name)
}
