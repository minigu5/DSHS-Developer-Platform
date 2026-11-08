// 프로젝트 상세에 필요한 데이터를 한 번에 모은다 — 서버 페이지와 브라우저의 빠른 상세 화면(quick-view)이 같이 쓴다.
// 서버 전용 코드(서비스 키·쿠키)를 import 하지 않는다: 어느 쪽이든 Supabase 클라이언트를 넘겨받는다.
// 관리자 전용(익명 프로젝트 주인)·연결된 주소는 부르는 쪽이 따로 읽는다.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import type { CommentRowView } from '@/lib/comments'
import { isDeveloper } from '@/lib/constants'
import { PROJECT_AUTHOR, PROJECT_COLUMNS } from '@/lib/projects/columns'
import { domainOfferOf, previewAddressOf } from '@/lib/domains/offer'
import { fixOldAddresses, oldAddressPrefixes } from '@/lib/domains/old-address'
import { posterSlotVisible } from '@/lib/posters/hang-logic'

type Client = SupabaseClient<Database>

export type DetailViewer = { id: string; email: string | null } | null

function selectProject(client: Client, id: string) {
  return client.from('projects').select(`${PROJECT_COLUMNS}, ${PROJECT_AUTHOR} (*)`).eq('id', id).single()
}

export type ProjectDetailRow = NonNullable<Awaited<ReturnType<typeof selectProject>>['data']>

export type TeamMemberProfile = {
  id: string
  email: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
}

export type ProjectDetail = {
  project: ProjectDetailRow
  comments: CommentRowView[]
  heartCount: number
  hearted: boolean
  teamMemberProfiles: TeamMemberProfile[]
  isOwner: boolean
  canEdit: boolean
  ownerPreview: { host: string; live: string } | null
  ownerOffer: ReturnType<typeof domainOfferOf>
  ownerOldAddress: { fqdn: string; lines: { before: string; after: string }[] } | null
  /** 옆칸의 빈 포스터 칸(누르면 포스터 옆 칸) — 주인·팀원, 공개, 걸린 포스터 없음 */
  posterSlot: boolean
}

/**
 * `data`: 프로젝트·댓글·하트 수·팀원을 읽는 클라이언트(서버는 개발자 계정이면 서비스 키).
 * `self`: 본인 권한으로만 읽는 것(내 하트·내 프로젝트·내 주소). 브라우저는 둘이 같다.
 * 못 찾으면 null.
 */
export async function loadProjectDetail(
  { data, self }: { data: Client; self: Client },
  id: string,
  viewer: DetailViewer,
): Promise<ProjectDetail | null> {
  const [projectResult, commentsResult, myHeartResult] = await Promise.all([
    selectProject(data, id),
    // user_id 는 사용자 키로 못 읽는다 — 사람은 public_user_id 로만 붙인다(익명 프로젝트 소유자의 댓글은 NULL)
    data
      .from('project_comments')
      .select('id, content, created_at, is_author, public_user_id, user:users!project_comments_public_user_id_fkey(full_name, nickname, avatar_url)')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    viewer
      ? self.from('project_hearts').select('project_id').eq('project_id', id).eq('user_id', viewer.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const project = projectResult.data
  if (projectResult.error || !project) return null

  const comments: CommentRowView[] = (commentsResult.data ?? []).map((c) => ({
    ...c,
    user: Array.isArray(c.user) ? c.user[0] ?? null : c.user,
  }))

  const isAnonymous = project.author_role === 'anonymous'

  // 팀 프로젝트인 경우 팀원 프로필 조회. 익명 프로젝트는 소유자를 화면에서 알 수 없으니 my_project_ids() 로 본인 것인지 확인한다
  const [teamMemberProfiles, myProjectIds] = await Promise.all([
    project.author_role === 'team' && project.team_members?.length
      ? data
          .from('users')
          .select('id, email, nickname, full_name, avatar_url')
          .in('email', project.team_members)
          .then(({ data: members }) => members ?? [])
      : Promise.resolve([] as TeamMemberProfile[]),
    viewer && isAnonymous
      ? self.rpc('my_project_ids').then(({ data: ids }) => ids ?? [])
      : Promise.resolve([] as string[]),
  ])

  // 수정 버튼: 소유자·팀원·개발자 계정
  const isOwner =
    !!viewer &&
    ((!!project.public_author_id && project.public_author_id === viewer.id) || (isAnonymous && myProjectIds.includes(project.id)))
  const isTeamMember = !!viewer?.email && (project.team_members ?? []).includes(viewer.email)
  const canEdit = !!viewer && (isOwner || isDeveloper(viewer.email) || isTeamMember)

  // 소유자에게만: 미리보기 주소 경고, 아니면 도메인 마련하기 안내(공개 웹사이트·이 프로젝트에 주소 없음·계정당 3개 미만),
  // 그리고 주소를 연결했는데 상세 설명에 옛 사이트 주소가 남아 있으면 바꿀지 묻는다. 주소는 소유자 본인 것이라 본인 권한으로 읽힌다
  const ownerPreview = isOwner && project.url ? previewAddressOf(project.url) : null
  let ownerOffer: ProjectDetail['ownerOffer'] = null
  let ownerOldAddress: ProjectDetail['ownerOldAddress'] = null
  if (viewer && isOwner) {
    const offer =
      !ownerPreview && project.url && project.visibility === 'public' && (project.types ?? []).includes('website')
        ? domainOfferOf(project.url)
        : null
    const [mine, source] = await Promise.all([
      offer
        ? self
            .from('subdomains')
            .select('project_id')
            .eq('owner_id', viewer.id)
            .in('status', ['reserved', 'pending', 'active', 'broken'])
            .then(({ data: rows }) => rows)
        : Promise.resolve(null),
      project.description
        ? self
            .from('subdomains')
            .select('name, host, target, site_url, previous_url')
            .eq('project_id', project.id)
            .eq('status', 'active')
            .maybeSingle()
            .then(({ data: row }) => row)
        : Promise.resolve(null),
    ])
    if (offer && mine && mine.length < 3 && !mine.some((row) => row.project_id === project.id)) ownerOffer = offer
    if (source && project.description) {
      const prefixes = oldAddressPrefixes({
        name: source.name,
        host: source.host,
        target: source.target,
        siteUrl: source.site_url,
        previousUrl: source.previous_url,
      })
      const fix = fixOldAddresses(project.description, prefixes, source.name)
      if (fix.count > 0) ownerOldAddress = { fqdn: `${source.name}.dshs.dev`, lines: fix.lines }
    }
  }

  const posterSlot = posterSlotVisible({
    isOwnerOrTeam: isOwner || isTeamMember,
    isPublic: project.visibility === 'public',
    hasHungPoster: !!project.poster_image_url,
  })

  return {
    project,
    comments,
    // project_hearts 는 본인 행만 읽힌다 — 수는 트리거가 채우는 칸으로
    heartCount: project.heart_count ?? 0,
    hearted: !!myHeartResult.data,
    teamMemberProfiles,
    isOwner,
    canEdit,
    ownerPreview,
    ownerOffer,
    ownerOldAddress,
    posterSlot,
  }
}
