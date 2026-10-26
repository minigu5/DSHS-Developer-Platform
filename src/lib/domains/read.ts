import 'server-only'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Json, SubdomainHost, SubdomainStatus } from '@/lib/types'

import { isRedirectHost, type TxtInput } from './hosts'

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
}

export type DomainProjectRow = {
  project: { id: string; title: string; url: string | null; iconUrl: string | null }
  /** 살아 있는 주소, 없으면 가장 최근 회수된 주소(이유를 보여 주려고), 그것도 없으면 null */
  domain: DomainView | null
}

const LIVE: SubdomainStatus[] = ['reserved', 'pending', 'active', 'broken']
const DOMAIN_COLUMNS =
  'id, name, status, host, target, txt_records, verify_token, ever_active, broken_since, revoked_reason, created_at, project_id'

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
  }
}

export const LIVE_STATUSES = LIVE

/** 내 웹사이트 프로젝트(소유자만)와 그 주소. RLS 를 타는 사용자 클라이언트로 읽는다. */
export async function listMyDomainProjects(userId: string): Promise<DomainProjectRow[]> {
  const supabase = await createClient()
  const [{ data: projects }, { data: domains }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, url, icon_url, types')
      .eq('author_id', userId)
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
      project: { id: p.id, title: p.title, url: p.url, iconUrl: p.icon_url },
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

/** 홈 소개 카드용 — 연결이 확인된(active) 공개 프로젝트의 주소 수와 최근 주소. 비공개 프로젝트는 숫자에도 안 센다. */
export type DomainShowcase = {
  total: number
  items: { name: string; projectId: string; title: string }[]
}

/** 로그인과 상관없이 보여 주는 값이라 서비스 키로 읽는다. 실패해도 홈이 깨지지 않게 null. */
export async function getDomainShowcase(limit = 6): Promise<DomainShowcase | null> {
  try {
    const admin = createAdminClient()
    const { data, count, error } = await admin
      .from('subdomains')
      .select('name, projects!subdomains_project_id_fkey!inner(id, title, visibility)', { count: 'exact' })
      .eq('status', 'active')
      .eq('projects.visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return null

    type Joined = { name: string; projects: { id: string; title: string } | null }
    const items = ((data ?? []) as unknown as Joined[]).flatMap((r) =>
      r.projects ? [{ name: r.name, projectId: r.projects.id, title: r.projects.title }] : [],
    )
    return { total: count ?? items.length, items }
  } catch {
    return null
  }
}
