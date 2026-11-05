import 'server-only'

// 관리자 대시보드 읽기. 부르는 쪽(페이지·액션)이 requireAdmin() 을 먼저 확인한다.
// 읽기 함수(admin_*)는 service_role 전용이라 서비스 키로만 부를 수 있다.

import { listAllSubdomains, type AdminDomainRow } from '@/lib/domains/read'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types'

import { buildTodayItems, type Burst, type ContentKind, type EndedBan, type FeedItem, type GuideShrink, type TodayItem } from './today'

export type Counts = {
  users: number
  projects: number
  projectComments: number
  tips: number
  tipComments: number
  ideas: number
  guideEdits: number
  clicks: number
}
export type SiteStats = { today: Counts; yesterday: Counts; week: Counts; activeDomains: number; activeBans: number }

export type BanRow = {
  banId: string
  userId: string | null
  name: string | null
  anonymous: boolean
  until: string | null
  reason: string | null
  createdAt: string
}

/** 화면에 넘기는 오늘 확인할 것 — 위키 되돌리기에 필요한 값만 덧붙인다 */
export type AdminTodayItem = TodayItem & { guide?: { docKey: string; revNo: number } }

export type AdminDashboard = {
  today: AdminTodayItem[]
  stats: SiteStats
  feed: FeedItem[]
  bans: BanRow[]
  domains: AdminDomainRow[]
}

type RpcFeedItem = FeedItem & { authorId?: string | null }
type RpcGuideShrink = GuideShrink & { revNo: number; authorId: string | null }

/** 작성자 id 는 차단 액션이 서버에서 다시 찾으므로 화면으로 넘기지 않는다(익명 작성자 보호) */
export function stripAuthor<T extends RpcFeedItem>(item: T): FeedItem {
  return {
    kind: item.kind,
    id: item.id,
    createdAt: item.createdAt,
    authorName: item.anonymous ? null : item.authorName,
    anonymous: item.anonymous,
    title: item.title,
    body: item.body,
    href: item.href,
  }
}

const asArray = <T>(v: Json | null): T[] => (Array.isArray(v) ? (v as unknown as T[]) : [])

export async function loadFeed(kinds: ContentKind[] | null, before: string | null): Promise<FeedItem[]> {
  const { data, error } = await createAdminClient().rpc('admin_recent_content', { p_kinds: kinds, p_before: before, p_limit: 50 })
  if (error) throw error
  return asArray<RpcFeedItem>(data).map(stripAuthor)
}

export async function loadAdminDashboard(): Promise<AdminDashboard> {
  const admin = createAdminClient()

  // 탈퇴한 사람의 차단 기록은 차단이 끝나면 파기한다(처리방침)
  await admin.from('user_bans').delete().is('user_id', null).lt('until', new Date().toISOString())

  const [stats, feed, bursts, shrinks, bans, dismissals, domains] = await Promise.all([
    admin.rpc('admin_site_stats'),
    admin.rpc('admin_recent_content', { p_limit: 50 }),
    admin.rpc('admin_bursts'),
    admin.rpc('admin_guide_shrinks'),
    admin.rpc('admin_bans'),
    admin.from('admin_dismissals').select('kind, item_id'),
    listAllSubdomains(),
  ])
  for (const r of [stats, feed, bursts, shrinks, bans, dismissals]) if (r.error) throw r.error

  const feedItems = asArray<RpcFeedItem>(feed.data).map(stripAuthor)
  const burstGroups = asArray<Burst>(bursts.data).map((b) => ({ ...b, items: b.items.map(stripAuthor) }))
  const guideShrinks = asArray<RpcGuideShrink>(shrinks.data)
  const banData = (bans.data ?? {}) as unknown as { active?: BanRow[]; ended?: EndedBan[] }

  const today = buildTodayItems({
    feed: feedItems,
    bursts: burstGroups,
    guideShrinks,
    brokenDomains: domains.filter((d) => d.status === 'broken').map((d) => ({ id: d.id, name: d.name, brokenSince: d.brokenSince ?? d.createdAt })),
    endedBans: banData.ended ?? [],
    dismissed: new Set((dismissals.data ?? []).map((d) => `${d.kind}:${d.item_id}`)),
  }).map((t): AdminTodayItem => {
    if (t.kind !== 'guide_shrink') return t
    const g = guideShrinks.find((s) => s.revId === t.target.id)
    return g ? { ...t, guide: { docKey: g.docKey, revNo: g.revNo } } : t
  })

  return {
    today,
    stats: stats.data as unknown as SiteStats,
    feed: feedItems,
    bans: banData.active ?? [],
    domains,
  }
}
