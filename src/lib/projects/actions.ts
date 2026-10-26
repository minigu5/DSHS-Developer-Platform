'use server'

// 프로젝트 삭제 · 비공개 전환 시 주소 닫기. 주소(서브도메인)가 있으면 먼저 반납하고 DNS 레코드를 지운다 —
// DB 트리거(projects_block_delete_with_subdomain)가 주소가 남은 프로젝트의 삭제를 막는다.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.

import { revalidatePath } from 'next/cache'

import { isAllowedEmail, isDeveloper } from '@/lib/constants'
import { removeCloudflare } from '@/lib/domains/cleanup'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type ProjectActionResult = { ok: true } | { ok: false; error: string }
export type DeleteProjectResult = ProjectActionResult

const FAILED = '삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.'

/** 프로젝트에 살아 있는 주소가 있으면 반납하고 Cloudflare 레코드(바로가기 항목 포함)를 지운다. 없으면 true, DB 반납이 실패하면 false. */
async function releaseLiveDomain(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  projectId: string,
  reason: string,
): Promise<boolean> {
  const { data: live } = await admin
    .from('subdomains')
    .select('id')
    .eq('project_id', projectId)
    .in('status', ['reserved', 'pending', 'active', 'broken'])
    .maybeSingle()
  if (!live) return true

  const { data: ids, error } = await admin.rpc('subdomain_release', {
    p_actor: actorId,
    p_id: live.id,
    p_reason: reason,
  })
  if (error) {
    console.error('[projects] 주소 반납 실패', error)
    return false
  }
  if (ids?.length) {
    // 실패해도 DB 는 반납 상태 — 남은 레코드는 매일 점검이 정리
    await removeCloudflare(ids).catch((e) => console.error('[projects] Cloudflare 레코드 삭제 실패', e))
  }
  return true
}

export async function deleteProject(projectId: string): Promise<ProjectActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return { ok: false, error: '학교 계정으로 로그인해야 해요.' }

  const admin = createAdminClient()
  const { data: project } = await admin.from('projects').select('author_id').eq('id', projectId).maybeSingle()
  if (!project || project.author_id !== user.id) return { ok: false, error: '내 프로젝트만 삭제할 수 있어요.' }

  if (!(await releaseLiveDomain(admin, user.id, projectId, 'project_deleted'))) return { ok: false, error: FAILED }

  // 실제 삭제는 사용자 권한(RLS: 소유자만)으로
  const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('author_id', user.id)
  if (error) {
    console.error('[projects] 삭제 실패', error)
    return { ok: false, error: FAILED }
  }

  revalidatePath('/explore')
  revalidatePath('/domains', 'layout')
  return { ok: true }
}

/**
 * 비공개로 바뀐 프로젝트의 주소를 닫는다(반납 + DNS 레코드 삭제). 수정 폼이 비공개로 저장한 *뒤에* 부른다 —
 * 저장 때 방문 주소가 이 주소로 같이 쓰이므로, 그 뒤에 반납해야 이전 방문 주소로 되돌아간다.
 * DB 에 저장된 공개 범위가 비공개일 때만 닫아서, 공개 프로젝트의 주소는 이 경로로 못 닫는다.
 */
export async function closeDomainOfPrivateProject(projectId: string): Promise<ProjectActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return { ok: false, error: '학교 계정으로 로그인해야 해요.' }

  const admin = createAdminClient()
  const { data: project } = await admin
    .from('projects')
    .select('author_id, visibility')
    .eq('id', projectId)
    .maybeSingle()
  if (!project || (project.author_id !== user.id && !isDeveloper(user.email))) {
    return { ok: false, error: '내 프로젝트만 바꿀 수 있어요.' }
  }
  if (project.visibility !== 'private') return { ok: false, error: '비공개로 저장된 프로젝트만 주소를 닫을 수 있어요.' }

  if (!(await releaseLiveDomain(admin, user.id, projectId, 'project_private'))) {
    return { ok: false, error: '주소를 반납하지 못했어요. 잠시 뒤 다시 저장해 주세요.' }
  }

  revalidatePath('/domains', 'layout')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}
