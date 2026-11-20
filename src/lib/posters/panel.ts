'use server'

// 프로젝트 수정 화면·상세 옆 칸(PosterSheet)이 읽는 포스터 목록.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(actions.ts 와 같은 이유).

import { createAdminClient } from '@/lib/supabase/server'

import { getBandAccess } from './access'
import { POSTER_LIMITS } from './config'
import { POSTER_COPY } from './messages'

const UUID = /^[0-9a-f-]{36}$/i

export interface PosterListItem {
  id: string
  imageUrl: string
  updatedAt: string
  // 지금 상세에 걸려 있는 포스터인지
  hung: boolean
}

export type PosterListResult =
  | { ok: true; title: string; posters: PosterListItem[]; hasHung: boolean; full: boolean }
  | { ok: false; error: string }

function accessError(access: 'login' | 'forbidden' | 'not_found'): string {
  return access === 'login' ? '로그인이 풀렸어요. 새로 고침해서 다시 로그인해 주세요.' : POSTER_COPY.noPermission
}

// 띠 받기·포스터 올리기·걸기는 수정할 수 있는 사람 누구나
export async function getPosterList(projectId: string): Promise<PosterListResult> {
  if (!UUID.test(projectId)) return { ok: false, error: POSTER_COPY.notFound }
  const access = await getBandAccess(projectId)
  if (typeof access === 'string') return { ok: false, error: accessError(access) }

  // 서비스 키 전용 표·칸 — 위에서 권한을 확인했다
  const admin = createAdminClient()
  const [{ data }, { data: project }] = await Promise.all([
    admin
      .from('project_posters')
      .select('id, image_url, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }),
    admin.from('projects').select('poster_id').eq('id', projectId).maybeSingle(),
  ])
  const hungId = project?.poster_id ?? null
  const rows = (data ?? []).filter((p): p is { id: string; image_url: string; updated_at: string } => !!p.image_url)

  return {
    ok: true,
    title: access.project.title,
    hasHung: !!hungId,
    full: rows.length >= POSTER_LIMITS.perProject,
    posters: rows.map((p) => ({ id: p.id, imageUrl: p.image_url, updatedAt: p.updated_at, hung: p.id === hungId })),
  }
}
