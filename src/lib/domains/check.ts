// 매일 점검(scripts/check-subdomains.mts)의 판단 — 네트워크·DB 없이 node:test 로 검증한다.
//   - 소유 확인 토큰이 보이면 정상
//   - 연결됐던 주소가 7일 넘게 끊겨 있으면 반납(주인이 떠난 주소를 남이 가로채지 못하게)
//   - 한 번도 연결되지 않은 채 7일이 지나면 반납(이름만 묶어 두기 방지)

import { RECORD_COMMENT_PREFIX } from './cloudflare.ts'
import type { CheckResult, FetchedPage } from './verify.ts'

export const RELEASE_AFTER_DAYS = 7
const DAY_MS = 86_400_000

export type CheckRow = {
  status: 'reserved' | 'pending' | 'active' | 'broken'
  created_at: string
  broken_since: string | null
  ever_active: boolean
}

export type Decision = { ok: boolean; release: null | 'broken_7d' | 'never_connected_7d' }

const olderThan = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime() > RELEASE_AFTER_DAYS * DAY_MS

/** result 가 null 이면 확인하지 않은 것(예약만 된 주소) */
export function decide(row: CheckRow, result: CheckResult | null, now: Date): Decision {
  if (result?.kind === 'ok') return { ok: true, release: null }
  if (!row.ever_active) {
    return { ok: false, release: olderThan(row.created_at, now) ? 'never_connected_7d' : null }
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
