import 'server-only'

// 관리자 대시보드 읽기. 부르는 쪽(페이지·액션)이 requireAdmin() 을 먼저 확인한다.
// 읽기 함수(admin_*)는 service_role 전용이라 서비스 키로만 부를 수 있다.

import { listAllSubdomains, type AdminDomainRow } from '@/lib/domains/read'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types'

import { toBanView, type BanView } from './ban'
import { personLabel } from './people'
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

export type BanRow = BanView

/** 화면에 넘기는 오늘 확인할 것 — 위키 되돌리기에 필요한 값만 덧붙인다 */
export type AdminTodayItem = TodayItem & { guide?: { docKey: string; revNo: number } }

export type AdminDashboard = {
  today: AdminTodayItem[]
  stats: SiteStats
  feed: FeedItem[]
  bans: BanView[]
  domains: AdminDomainRow[]
  /** 상세 페이지에 걸린 포스터 최근 20개 — 올리면 바로 걸리고 관리자가 나중에 본다(2026-11-07 사용자 결정) */
  hungPosters: HungPosterView[]
  /** 관리자가 비공개로 잠근 프로젝트 — 주인은 다시 공개할 수 없다(2026-11-07) */
  lockedProjects: LockedProjectView[]
}

export type LockedProjectView = { projectId: string; title: string; reason: string | null; lockedAt: string }

export type HungPosterView = { projectId: string; title: string; imageUrl: string; isAi: boolean; hungAt: string }

type RpcFeedItem = FeedItem & { authorId?: string | null }
type RpcGuideShrink = GuideShrink & { revNo: number; authorId: string | null }

/**
 * 작성자 id 는 차단 액션이 서버에서 다시 찾으므로 화면으로 넘기지 않는다.
 * 익명 글은 관리자에게만 실제 작성자 이름(realName)을 붙인다(2026-11-05 사용자 결정) — names 는 namesOf() 결과.
 */
export function stripAuthor<T extends RpcFeedItem>(item: T, names?: Map<string, string>): FeedItem {
  return {
    kind: item.kind,
    id: item.id,
    createdAt: item.createdAt,
    authorName: item.anonymous ? null : item.authorName,
    anonymous: item.anonymous,
    ...(item.anonymous && item.authorId ? { realName: names?.get(item.authorId) ?? null } : {}),
    title: item.title,
    body: item.body,
    href: item.href,
  }
}

const asArray = <T>(v: Json | null): T[] => (Array.isArray(v) ? (v as unknown as T[]) : [])

/** 사용자 id → 관리자 화면용 이름(닉네임 (실명)). 없는 id 는 빠진다 */
async function namesOf(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  if (unique.length === 0) return new Map()
  const { data, error } = await createAdminClient().from('users').select('id, nickname, full_name').in('id', unique)
  if (error) throw error
  return new Map((data ?? []).map((u) => [u.id, personLabel(u)]))
}

const anonymousAuthorIds = (items: RpcFeedItem[]) => items.filter((i) => i.anonymous).map((i) => i.authorId)

export async function loadFeed(kinds: ContentKind[] | null, before: string | null): Promise<FeedItem[]> {
  const { data, error } = await createAdminClient().rpc('admin_recent_content', { p_kinds: kinds, p_before: before, p_limit: 50 })
  if (error) throw error
  const items = asArray<RpcFeedItem>(data)
  const names = await namesOf(anonymousAuthorIds(items))
  return items.map((i) => stripAuthor(i, names))
}

export async function loadAdminDashboard(): Promise<AdminDashboard> {
  const admin = createAdminClient()

  // 탈퇴한 사람의 차단 기록은 차단이 끝나면 파기한다(처리방침)
  await admin.from('user_bans').delete().is('user_id', null).lt('until', new Date().toISOString())

  const [stats, feed, bursts, shrinks, bans, dismissals, domains, hung, locks] = await Promise.all([
    admin.rpc('admin_site_stats'),
    admin.rpc('admin_recent_content', { p_limit: 50 }),
    admin.rpc('admin_bursts'),
    admin.rpc('admin_guide_shrinks'),
    admin.rpc('admin_bans'),
    admin.from('admin_dismissals').select('kind, item_id'),
    listAllSubdomains(),
    admin
      .from('projects')
      .select('id, title, poster_image_url, poster_is_ai, poster_hung_at')
      .not('poster_image_url', 'is', null)
      .order('poster_hung_at', { ascending: false })
      .limit(20),
    admin.from('project_locks').select('project_id, reason, created_at').order('created_at', { ascending: false }),
  ])
  for (const r of [stats, feed, bursts, shrinks, bans, dismissals, hung, locks]) if (r.error) throw r.error
  const lockRows = locks.data ?? []
  const lockTitles = lockRows.length
    ? new Map(((await admin.from('projects').select('id, title').in('id', lockRows.map((l) => l.project_id))).data ?? []).map((p) => [p.id, p.title]))
    : new Map<string, string>()

  const rpcFeed = asArray<RpcFeedItem>(feed.data)
  const rpcBursts = asArray<Burst & { items: RpcFeedItem[] }>(bursts.data)
  const guideShrinks = asArray<RpcGuideShrink>(shrinks.data)
  const banData = (bans.data ?? {}) as unknown as { active?: (BanView & { userId: string | null })[]; ended?: EndedBan[] }
  // 익명 글·익명 글에서 건 차단도 관리자에게는 누구인지 보여 준다 — DB 함수는 이름을 비워 보내므로 id 로 다시 찾는다
  const names = await namesOf([
    ...anonymousAuthorIds(rpcFeed),
    ...rpcBursts.flatMap((b) => anonymousAuthorIds(b.items)),
    ...(banData.active ?? []).map((b) => b.userId),
  ])

  const feedItems = rpcFeed.map((i) => stripAuthor(i, names))
  const burstGroups = rpcBursts.map((b) => ({ ...b, items: b.items.map((i) => stripAuthor(i, names)) }))

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
    bans: (banData.active ?? []).map((b) => toBanView({ ...b, name: (b.userId && names.get(b.userId)) || b.name })),
    domains,
    hungPosters: (hung.data ?? []).map((p) => ({
      projectId: p.id,
      title: p.title,
      imageUrl: p.poster_image_url ?? '',
      isAi: p.poster_is_ai,
      hungAt: p.poster_hung_at ?? '',
    })),
    lockedProjects: lockRows.map((l) => ({
      projectId: l.project_id,
      title: lockTitles.get(l.project_id) ?? '(제목 없음)',
      reason: l.reason,
      lockedAt: l.created_at,
    })),
  }
}
