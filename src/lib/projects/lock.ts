import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

/** 관리자 잠금 — 있으면 주인·팀원은 다시 공개할 수 없다(DB 가드 projects_guard_locked). 이유는 선택 */
export type ProjectLock = { reason: string | null }

/**
 * project_locks 는 서비스 키 전용이라 서버에서만 읽는다. 부르는 쪽이 먼저 주인·팀원·관리자인지 확인할 것 —
 * 이유는 그 사람들에게만 보여 준다.
 */
export async function getProjectLock(projectId: string): Promise<ProjectLock | null> {
  const { data, error } = await createAdminClient()
    .from('project_locks')
    .select('reason')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) {
    console.error('[lock] 잠금 조회 실패', error.message)
    return null
  }
  return data ? { reason: data.reason } : null
}
