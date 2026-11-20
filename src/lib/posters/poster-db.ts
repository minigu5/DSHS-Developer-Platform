import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type { ProjectPosterRow } from '@/lib/types'

// project_posters 는 서비스 키로만 읽고 쓴다(RLS 정책 없음) — 부르기 전에 getBandAccess 로 권한을 확인할 것

export async function loadPoster(posterId: string): Promise<ProjectPosterRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(posterId)) return null
  const { data } = await createAdminClient().from('project_posters').select('*').eq('id', posterId).maybeSingle()
  return (data as ProjectPosterRow | null) ?? null
}
