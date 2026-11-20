import 'server-only'

import { banNoticeFor } from '@/lib/admin/guard'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createAdminClient, createClient } from '@/lib/supabase/server'

import { decideBandAccess, type AccessInput } from './decide'

export interface PosterAccess {
  userId: string
  isAdmin: boolean
  project: { id: string; title: string }
}

type AccessResult = PosterAccess | 'login' | 'forbidden' | 'not_found'

/**
 * 포스터 올리기·걸기·지우기·띠 받기 — 상세 페이지의 canEdit 과 같은 판정(소유자·팀원·관리자)에 공개 프로젝트·차단 검사를 더한다.
 * getUser() 로 확인한다(getSession 은 쿠키를 검증하지 않음).
 */
export async function getBandAccess(projectId: string): Promise<AccessResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'login'
  const isAdmin = await isAdminUser()

  // 관리자는 비공개도 읽히는 서비스 키, 그 외는 RLS 를 따르는 사용자 키
  const reader = isAdmin ? createAdminClient() : supabase
  const { data: project } = await reader.from('projects').select('id, title, visibility, team_members').eq('id', projectId).maybeSingle()
  if (!project) return 'not_found'

  const [{ data: mine }, banned] = await Promise.all([
    // author_id 는 사용자 키로 못 읽으니(익명 프로젝트 보호) my_project_ids() 로 본인 것인지 본다
    supabase.rpc('my_project_ids'),
    banNoticeFor(user.id),
  ])
  const input: AccessInput = {
    loggedIn: true,
    isAdmin,
    isOwner: ((mine as string[] | null) ?? []).includes(project.id),
    isTeamMember: !!user.email && (project.team_members ?? []).includes(user.email),
    isPublic: project.visibility === 'public',
    banned: banned !== null,
  }
  const decision = decideBandAccess(input)
  if (decision !== 'ok') return decision

  return { userId: user.id, isAdmin, project: { id: project.id, title: project.title } }
}
