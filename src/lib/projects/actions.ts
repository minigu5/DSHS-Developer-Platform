'use server'

// 프로젝트 삭제. 주소(서브도메인)가 있으면 먼저 반납하고 DNS 레코드를 지운 뒤 지운다 —
// DB 트리거(projects_block_delete_with_subdomain)가 주소가 남은 프로젝트의 삭제를 막는다.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.

import { revalidatePath } from 'next/cache'

import { isAllowedEmail } from '@/lib/constants'
import { removeCloudflare } from '@/lib/domains/cleanup'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type DeleteProjectResult = { ok: true } | { ok: false; error: string }

const FAILED = '삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.'

export async function deleteProject(projectId: string): Promise<DeleteProjectResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return { ok: false, error: '학교 계정으로 로그인해야 해요.' }

  const admin = createAdminClient()
  const { data: project } = await admin.from('projects').select('author_id').eq('id', projectId).maybeSingle()
  if (!project || project.author_id !== user.id) return { ok: false, error: '내 프로젝트만 삭제할 수 있어요.' }

  const { data: live } = await admin
    .from('subdomains')
    .select('id')
    .eq('project_id', projectId)
    .in('status', ['reserved', 'pending', 'active', 'broken'])
    .maybeSingle()
  if (live) {
    const { data: ids, error } = await admin.rpc('subdomain_release', {
      p_actor: user.id,
      p_id: live.id,
      p_reason: 'project_deleted',
    })
    if (error) {
      console.error('[projects] 주소 반납 실패', error)
      return { ok: false, error: FAILED }
    }
    if (ids?.length) {
      // 실패해도 DB 는 반납 상태 — 남은 레코드는 매일 점검이 정리
      await removeCloudflare(ids).catch((e) => console.error('[projects] Cloudflare 레코드 삭제 실패', e))
    }
  }

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
