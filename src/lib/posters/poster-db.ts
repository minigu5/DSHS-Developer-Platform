import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type { Json, ProjectPosterRow } from '@/lib/types'

import { posterArtPrintUrl } from './art-url'
import { canHangPoster } from './hang-logic'
import { hasArtSlot } from './sanitize'
import type { PosterState, PosterView } from './store'

// project_posters 는 서비스 키로만 읽고 쓴다(RLS 정책 없음) — 부르기 전에 getPosterAccess 로 권한을 확인할 것

export async function loadPoster(posterId: string): Promise<ProjectPosterRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(posterId)) return null
  const { data } = await createAdminClient().from('project_posters').select('*').eq('id', posterId).maybeSingle()
  return (data as ProjectPosterRow | null) ?? null
}

export async function savePosterState(posterId: string, state: PosterState): Promise<ProjectPosterRow | null> {
  const { data, error } = await createAdminClient()
    .from('project_posters')
    .update({
      html: state.html,
      art_url: state.art_url,
      art_order: state.art_order as unknown as Json,
      art_job_id: state.art_job_id,
      versions: state.versions as unknown as Json,
      messages: state.messages as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', posterId)
    .select('*')
    .single()
  if (!data) console.error('[poster] savePosterState', error?.message)
  return (data as ProjectPosterRow | null) ?? null
}

export function toPosterView(row: ProjectPosterRow): PosterView {
  return {
    id: row.id,
    projectId: row.project_id,
    html: row.html,
    artUrl: row.art_url,
    tone: row.band_tone,
    position: row.band_position ?? 'bottom',
    messages: row.messages ?? [],
    canUndo: (row.versions ?? []).length > 0,
    canRedraw: !row.art_job_id && !row.ai_job_id && !!row.art_order && !!row.html && hasArtSlot(row.html),
    artPending: !!row.art_job_id,
    aiJobId: row.ai_job_id,
    artPrintUrl: row.art_url && !row.art_job_id ? posterArtPrintUrl(row.art_url, row.art_order) : null,
    updatedAt: row.updated_at,
    kind: row.kind,
    imageUrl: row.image_url,
    canHang: canHangPoster(row),
  }
}
