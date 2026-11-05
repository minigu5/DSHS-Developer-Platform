import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Json, SubdomainHost, SubdomainStatus } from '@/lib/types'

import { isRedirectHost, type TxtInput } from './hosts'
import type { OldAddressSource } from './old-address'

/** 화면에 넘기는 주소 정보 — Cloudflare 레코드 id 같은 내부 값은 빼고 */
export type DomainView = {
  id: string
  name: string
  status: SubdomainStatus
  host: SubdomainHost | null
  target: string | null
  txt: TxtInput[]
  verifyToken: string
  everActive: boolean
  brokenSince: string | null
  revokedReason: string | null
  createdAt: string
  /** ② 소유 확인에 쓰는 학생 사이트 원래 주소 */
  siteUrl: string | null
  siteHost: SubdomainHost | null
  siteVerified: boolean
  connectedAt: string | null
}

export type DomainProjectRow = {
  project: { id: string; title: string; url: string | null; iconUrl: string | null; isPrivate: boolean }
  /** 살아 있는 주소, 없으면 가장 최근 회수된 주소(이유를 보여 주려고), 그것도 없으면 null */
  domain: DomainView | null
}

const LIVE: SubdomainStatus[] = ['reserved', 'pending', 'active', 'broken']
const DOMAIN_COLUMNS =
  'id, name, status, host, target, txt_records, verify_token, ever_active, broken_since, revoked_reason, created_at, project_id, site_url, site_host, site_verified_at, connected_at'

type DomainRow = {
  id: string
  name: string
  status: SubdomainStatus
  host: SubdomainHost | null
  target: string | null
  txt_records: Json
  verify_token: string
  ever_active: boolean
  broken_since: string | null
  revoked_reason: string | null
  created_at: string
  project_id: string | null
  site_url: string | null
  site_host: SubdomainHost | null
  site_verified_at: string | null
  connected_at: string | null
}

function toTxt(raw: Json): TxtInput[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((r) =>
    r && typeof r === 'object' && !Array.isArray(r) && typeof r.name === 'string' && typeof r.value === 'string'
      ? [{ name: r.name, value: r.value }]
      : [],
  )
}

function toView(r: DomainRow): DomainView {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    host: r.host,
    target: r.target,
    txt: toTxt(r.txt_records),
    verifyToken: r.verify_token,
    everActive: r.ever_active,
    brokenSince: r.broken_since,
    revokedReason: r.revoked_reason,
    createdAt: r.created_at,
    siteUrl: r.site_url,
    siteHost: r.site_host,
    siteVerified: r.site_verified_at !== null,
    connectedAt: r.connected_at,
  }
}

export const LIVE_STATUSES = LIVE

/** 내 웹사이트 프로젝트(소유자만)와 그 주소. RLS 를 타는 사용자 클라이언트로 읽는다. */
export async function listMyDomainProjects(userId: string): Promise<DomainProjectRow[]> {
  const supabase = await createClient()
  // author_id 는 사용자 키로 못 읽는다(익명 프로젝트 보호) — 익명까지 포함한 내 프로젝트 id 를 함수로 받는다
  const { data: myIds } = await supabase.rpc('my_project_ids')
  const [{ data: projects }, { data: domains }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, url, icon_url, types, visibility')
      .in('id', myIds ?? [])
      .contains('types', ['website'])
      .order('created_at', { ascending: false })
      .order('id'),
    supabase
      .from('subdomains')
      .select(DOMAIN_COLUMNS)
      .eq('owner_id', userId)
      .in('status', [...LIVE, 'revoked'])
      .order('created_at', { ascending: false }),
  ])

  const byProject = new Map<string, DomainRow>()
  for (const d of (domains ?? []) as DomainRow[]) {
    if (!d.project_id) continue
    const prev = byProject.get(d.project_id)
    // 살아 있는 주소가 회수 기록보다 우선
    if (!prev || (prev.status === 'revoked' && LIVE.includes(d.status))) byProject.set(d.project_id, d)
  }

  return (projects ?? []).map((p) => {
    const d = byProject.get(p.id)
    return {
      project: { id: p.id, title: p.title, url: p.url, iconUrl: p.icon_url, isPrivate: p.visibility === 'private' },
      domain: d ? toView(d) : null,
    }
  })
}

export type AdminDomainRow = DomainView & {
  ownerName: string
  projectTitle: string | null
  projectId: string | null
}

/** 관리자 화면 — 살아 있거나 회수된 모든 주소. 호출하는 쪽이 관리자 확인을 먼저 한다. */
export async function listAllSubdomains(): Promise<AdminDomainRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subdomains')
    .select(`${DOMAIN_COLUMNS}, owner:users!subdomains_owner_id_fkey(nickname, full_name), project:projects!subdomains_project_id_fkey(title)`)
    .in('status', [...LIVE, 'revoked'])
    .order('created_at', { ascending: false })

  type Joined = DomainRow & {
    owner: { nickname: string | null; full_name: string | null } | null
    project: { title: string } | null
  }
  return ((data ?? []) as unknown as Joined[]).map((r) => ({
    ...toView(r),
    ownerName: r.owner?.nickname || r.owner?.full_name || '알 수 없음',
    projectTitle: r.project?.title ?? null,
    projectId: r.project_id,
  }))
}

/** 프로젝트에 연결된(active) 주소 — 상세 정보 카드·삭제 확인창용. 비공개 프로젝트도 있어 서비스 키로 읽는다. */
export async function getLiveDomain(projectId: string, onlyActive = false): Promise<{ name: string; redirect: boolean } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subdomains')
    .select('name, host')
    .eq('project_id', projectId)
    .in('status', onlyActive ? ['active'] : LIVE)
    .maybeSingle()
  return data ? { name: data.name, redirect: isRedirectHost(data.host) } : null
}

/** 연결된(active) 주소와 옛 사이트 주소 후보 — 상세 페이지의 "설명 속 옛 주소" 안내·바꾸기용. 호출하는 쪽이 소유자 확인을 먼저 한다. */
export async function getOldAddressSource(projectId: string): Promise<OldAddressSource | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subdomains')
    .select('name, host, target, site_url, previous_url')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .maybeSingle()
  return data ? { name: data.name, host: data.host, target: data.target, siteUrl: data.site_url, previousUrl: data.previous_url } : null
}

/** 홈 소개 카드용 — 연결이 확인된(active) 공개 프로젝트의 주소 수와 최근 주소. 비공개 프로젝트는 숫자에도 안 센다.
 * 브라우저가 DB 함수 `domain_showcase`로 읽는다(`src/components/home/home-data.ts`). */
export type DomainShowcase = {
  total: number
  items: { name: string; projectId: string; title: string }[]
}
