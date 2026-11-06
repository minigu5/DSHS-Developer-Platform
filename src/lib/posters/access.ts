import 'server-only'

import { banNoticeFor } from '@/lib/admin/guard'
import { isDeveloper } from '@/lib/constants'
import { createAdminClient, createClient } from '@/lib/supabase/server'

import type { PosterProjectInfo } from './config'
import { decideBandAccess, decidePosterAccess, type AccessInput } from './decide'
import { summarizeDescription } from './prompt'

export interface PosterAccess {
  userId: string
  isAdmin: boolean
  // AI 포스터 만들기를 쓸 수 있는지(1단계 관리자만). 띠 받기는 이것과 상관없음
  canUseAi: boolean
  project: PosterProjectInfo
  // 처음 만들 때 저장소 내용을 더하려고(Gemini 에 직접 보내지는 않음). 소스코드 공개일 때만
  shortDescription: string | null
  repoUrl: string | null
}

type AccessResult = PosterAccess | 'login' | 'forbidden' | 'not_found'

/**
 * 이 프로젝트의 AI 포스터를 만들고 고칠 수 있는지. 상세 페이지의 canEdit 과 같은 판정(소유자·팀원·개발자 계정)에
 * 1단계 관리자 전용·공개 프로젝트·차단 검사를 더한다. getUser() 로 확인한다(getSession 은 쿠키를 검증하지 않음).
 */
export async function getPosterAccess(projectId: string): Promise<AccessResult> {
  return loadAccess(projectId, decidePosterAccess)
}

/** 포스터 띠 받기 — AI 를 안 쓰니 관리자 제한 없이 수정할 수 있는 사람이면 누구나. canUseAi 로 AI 칸을 보일지 정한다. */
export async function getBandAccess(projectId: string): Promise<AccessResult> {
  return loadAccess(projectId, decideBandAccess)
}

async function loadAccess(projectId: string, decide: (i: AccessInput) => 'ok' | 'login' | 'forbidden' | 'not_found'): Promise<AccessResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'login'
  const isAdmin = isDeveloper(user.email)

  // 개발자 계정은 비공개도 읽히는 서비스 키, 그 외는 RLS 를 따르는 사용자 키
  const reader = isAdmin ? createAdminClient() : supabase
  const { data: project } = await reader
    .from('projects')
    .select('id, title, short_description, description, types, platforms, url, visibility, team_members, source_type, repo_url')
    .eq('id', projectId)
    .maybeSingle()
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
  const decision = decide(input)
  if (decision !== 'ok') return decision

  const summary = [project.short_description, summarizeDescription(project.description ?? '')].filter(Boolean).join(' — ')
  return {
    userId: user.id,
    isAdmin,
    canUseAi: decidePosterAccess(input) === 'ok',
    shortDescription: project.short_description ?? null,
    repoUrl: project.source_type === 'open' ? (project.repo_url ?? null) : null,
    project: {
      id: project.id,
      title: project.title,
      summary: summary.slice(0, 1200),
      types: project.types ?? [],
      platforms: project.platforms ?? [],
      url: project.url ?? null,
    },
  }
}
