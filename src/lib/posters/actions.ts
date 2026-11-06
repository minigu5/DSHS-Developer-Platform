'use server'

// 포스터 만들기(빈 포스터 → 스튜디오로)·지우기·되돌리기·띠 색. AI 를 부르는 만들기·고치기는 /api/posters/[id]/ask.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(src/lib/projects/actions.ts 와 같은 이유).

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/server'

import { getPosterAccess } from './access'
import { cancelArtJob } from './art-jobs'
import type { PosterBandPosition, PosterTone } from './config'
import { POSTER_COPY } from './messages'
import { loadPoster, savePosterState, toPosterView } from './poster-db'
import { undoPosterState, type PosterView } from './store'

async function posterWithAccess(posterId: string) {
  const poster = await loadPoster(posterId)
  if (!poster) return { error: POSTER_COPY.notFound } as const
  const access = await getPosterAccess(poster.project_id)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission } as const
  return { poster, access } as const
}

export async function createPoster(projectId: string): Promise<{ error: string }> {
  const access = await getPosterAccess(projectId)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  const { data, error } = await createAdminClient()
    .from('project_posters')
    .insert({ project_id: projectId, created_by: access.userId })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.message.includes('poster_daily')) return { error: POSTER_COPY.daily }
    if (error?.message.includes('poster_limit')) return { error: POSTER_COPY.limit }
    return { error: '포스터를 만들지 못했어요. 잠시 뒤 다시 해 주세요.' }
  }
  revalidatePath(`/projects/${projectId}/poster`)
  redirect(`/projects/${projectId}/poster/${data.id}`)
}

export async function deletePoster(posterId: string): Promise<{ error?: string }> {
  const found = await posterWithAccess(posterId)
  if ('error' in found) return { error: found.error }
  const { error } = await createAdminClient().from('project_posters').delete().eq('id', posterId)
  if (error) return { error: '지우지 못했어요. 잠시 뒤 다시 해 주세요.' }
  revalidatePath(`/projects/${found.poster.project_id}/poster`)
  return {}
}

export async function undoPoster(posterId: string): Promise<{ error?: string; poster?: PosterView }> {
  const found = await posterWithAccess(posterId)
  if ('error' in found) return { error: found.error }
  const state = undoPosterState(found.poster)
  if (!state) return { error: '되돌릴 버전이 없어요.' }
  // 기다리던 학교 Mac 그림은 취소 — 늦게 와도 되돌린 포스터에 붙지 않는다
  if (found.poster.art_job_id) await cancelArtJob(found.poster.art_job_id)
  const saved = await savePosterState(posterId, state)
  if (!saved) return { error: '되돌리지 못했어요. 잠시 뒤 다시 해 주세요.' }
  return { poster: toPosterView(saved) }
}

export async function setPosterBand(posterId: string, band: { tone: PosterTone; position: PosterBandPosition }): Promise<{ error?: string }> {
  if ((band.tone !== 'light' && band.tone !== 'dark') || (band.position !== 'top' && band.position !== 'bottom')) {
    return { error: '띠를 다시 골라 주세요.' }
  }
  const found = await posterWithAccess(posterId)
  if ('error' in found) return { error: found.error }
  const { error } = await createAdminClient()
    .from('project_posters')
    .update({ band_tone: band.tone, band_position: band.position, updated_at: new Date().toISOString() })
    .eq('id', posterId)
  return error ? { error: '띠를 바꾸지 못했어요.' } : {}
}
