// 이벤트 수상 배지(2026-11-17) — 관리자가 이벤트·등위를 매기면 프로젝트 카드·상세에 "이벤트명 · 등위"로 보인다.
// 서버·브라우저 둘 다에서 쓰는 순수 로직(서버 전용 import 금지).

/** 프로젝트 쿼리에 붙이는 조각 — project_awards(rank_label, created_at, events(name)) */
export const AWARDS_SELECT = 'project_awards(rank_label, created_at, events(name))' as const

/** 쿼리가 돌려주는 모양 — events 는 객체 또는 배열로 올 수 있어 둘 다 허용 */
export type AwardRow = {
  rank_label: string
  created_at?: string | null
  events: { name: string } | { name: string }[] | null
}

export type Award = { eventName: string; rankLabel: string; tone: AwardTone }

/** 1위·2위·3위는 금·은·동, 나머지(대상·우수상 등)는 중립 */
export type AwardTone = 'gold' | 'silver' | 'bronze' | 'plain'

export function awardTone(rankLabel: string): AwardTone {
  const m = rankLabel.trim().match(/(^|\s)(\d+)\s*(위|등)/)
  if (m) {
    const n = Number(m[2])
    if (n === 1) return 'gold'
    if (n === 2) return 'silver'
    if (n === 3) return 'bronze'
    return 'plain'
  }
  return /대상|최우수|금상/.test(rankLabel) ? 'gold' : /은상/.test(rankLabel) ? 'silver' : /동상/.test(rankLabel) ? 'bronze' : 'plain'
}

/** 등위가 높은(금 → 은 → 동 → 나머지) 순, 같으면 먼저 받은 순 */
const TONE_ORDER: Record<AwardTone, number> = { gold: 0, silver: 1, bronze: 2, plain: 3 }

export function awardsOf(rows: AwardRow[] | null | undefined): Award[] {
  const out: (Award & { at: string })[] = []
  for (const r of rows ?? []) {
    const ev = Array.isArray(r.events) ? r.events[0] : r.events
    if (!ev?.name || !r.rank_label) continue
    out.push({ eventName: ev.name, rankLabel: r.rank_label, tone: awardTone(r.rank_label), at: r.created_at ?? '' })
  }
  out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.at.localeCompare(b.at))
  return out.map(({ eventName, rankLabel, tone }) => ({ eventName, rankLabel, tone }))
}

/** 관리자 입력 다듬기 — 앞뒤 공백 제거·연속 공백 하나로 */
export function cleanLabel(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
