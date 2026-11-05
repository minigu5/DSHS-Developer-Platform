// 관리자 대시보드 맨 위 "오늘 확인할 것" 조립. 자료는 서버가 대시보드 읽기 함수(admin_*)로 가져와 넘긴다.
// 익명 글은 RPC 단계에서 authorName 이 null 이고, 여기서도 그대로 둔다(화면은 '익명').

import { hasProfanity } from './profanity.ts'

export type ContentKind = 'project' | 'project_comment' | 'tip' | 'tip_comment' | 'idea' | 'guide' | 'profile'

export type FeedItem = {
  kind: ContentKind
  id: string
  createdAt: string
  authorName: string | null
  anonymous: boolean
  title: string | null
  body: string
  href: string
}

export type Burst = { kind: ContentKind; authorKey: string; anonymous: boolean; items: FeedItem[] }
export type GuideShrink = { revId: string; docKey: string; docTitle: string; minus: number; plus: number; createdAt: string }
export type BrokenDomain = { id: string; name: string; brokenSince: string }
export type EndedBan = { banId: string; name: string | null; anonymous: boolean; until: string }

export type TodayKind = 'profanity' | 'burst' | 'guide_shrink' | 'broken_domain' | 'ban_ended'

export type TodayItem = {
  /** `${kind}:${target.id}` — 확인함 기록(admin_dismissals) 키 */
  key: string
  kind: TodayKind
  reason: string
  target: { kind: string; id: string }
  at: string
  items?: FeedItem[]
}

type Input = {
  feed: FeedItem[]
  bursts: Burst[]
  guideShrinks: GuideShrink[]
  brokenDomains: BrokenDomain[]
  endedBans: EndedBan[]
  dismissed: Set<string>
}

const newestFirst = (a: TodayItem, b: TodayItem) => b.at.localeCompare(a.at)

function make(kind: TodayKind, target: { kind: string; id: string }, reason: string, at: string, items?: FeedItem[]): TodayItem {
  return { key: `${kind}:${target.id}`, kind, reason, target, at, ...(items ? { items } : {}) }
}

export function buildTodayItems(input: Input): TodayItem[] {
  const groups: TodayItem[][] = [
    input.feed
      .filter((f) => hasProfanity(`${f.title ?? ''} ${f.body}`))
      .map((f) => make('profanity', { kind: f.kind, id: f.id }, '비속어가 있어요', f.createdAt, [f])),
    input.bursts.map((b) => {
      const latest = b.items.reduce((m, i) => (i.createdAt > m ? i.createdAt : m), '')
      // 묶음 대상 id 는 가장 먼저 올린 글 — 같은 묶음이 다시 잡혀도 키가 같다
      const first = b.items.reduce((m, i) => (i.createdAt < m.createdAt ? i : m), b.items[0])
      return make('burst', { kind: b.kind, id: first.id }, `10분 안에 ${b.items.length}개를 올렸어요`, latest, b.items)
    }),
    input.guideShrinks.map((g) => make('guide_shrink', { kind: 'guide', id: g.revId }, `한 번에 ${g.minus - g.plus}자를 지웠어요`, g.createdAt)),
    input.brokenDomains.map((d) => make('broken_domain', { kind: 'domain', id: d.id }, '주소가 끊겼어요', d.brokenSince)),
    input.endedBans.map((b) => make('ban_ended', { kind: 'ban', id: b.banId }, '차단이 끝났어요', b.until)),
  ]
  return groups.flatMap((g) => g.filter((t) => !input.dismissed.has(t.key)).sort(newestFirst))
}
