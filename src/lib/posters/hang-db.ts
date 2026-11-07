import 'server-only'

import { revalidatePath } from 'next/cache'

import { deleteCloudinaryImages } from '@/lib/cloudinary-delete'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * 상세 페이지에 걸린 포스터를 바꾼다(null = 내리기 — DB 트리거 projects_poster_clear 가 나머지 칸을 비움).
 * projects 의 poster_* 칸은 사용자 키로 못 바꾸니 서비스 키로 — 권한 확인(getBandAccess)은 부르는 쪽 몫.
 * 이전에 걸려 있던 게 AI 포스터를 찍은 PNG 였고 새 주소와 다르면 Cloudinary 에서 지운다(직접 올린 그림은 포스터 자체라 남김).
 */
export async function setHungPoster(projectId: string, hung: { posterId: string; imageUrl: string; isAi: boolean } | null): Promise<boolean> {
  const admin = createAdminClient()
  const { data: before } = await admin.from('projects').select('poster_image_url, poster_is_ai').eq('id', projectId).maybeSingle()
  const { error } = await admin
    .from('projects')
    .update(
      hung
        ? { poster_id: hung.posterId, poster_image_url: hung.imageUrl, poster_is_ai: hung.isAi, poster_hung_at: new Date().toISOString() }
        : { poster_id: null },
    )
    .eq('id', projectId)
  if (error) {
    console.error('[poster] 걸기 실패', error.message)
    return false
  }
  if (before?.poster_is_ai && before.poster_image_url && before.poster_image_url !== hung?.imageUrl) {
    await deleteCloudinaryImages([before.poster_image_url])
  }
  revalidatePath(`/projects/${projectId}`)
  return true
}

/**
 * AI 포스터 걸기 1단계 — 그림 주소 없이 먼저 건다(PNG 는 뒤에서 찍음, hangState 가 'rendering'). 이전 AI PNG 는 바로 지운다.
 * 돌려준 걸린 시각으로 2단계(finishHungPng)가 "아직 이 걸기가 유효한지" 확인한다. 실패하면 null.
 */
export async function startHangingAi(projectId: string, posterId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: before } = await admin.from('projects').select('poster_image_url, poster_is_ai').eq('id', projectId).maybeSingle()
  const hungAt = new Date().toISOString()
  const { error } = await admin
    .from('projects')
    .update({ poster_id: posterId, poster_image_url: null, poster_is_ai: true, poster_hung_at: hungAt })
    .eq('id', projectId)
  if (error) {
    console.error('[poster] 걸기 실패', error.message)
    return null
  }
  if (before?.poster_is_ai && before.poster_image_url) await deleteCloudinaryImages([before.poster_image_url])
  revalidatePath(`/projects/${projectId}`)
  return hungAt
}

/** 2단계 — 뒤에서 찍은 PNG 주소를 붙인다. 그사이 다른 포스터를 걸었거나 내렸으면 붙이지 않고 방금 찍은 PNG 를 지운다 */
export async function finishHungPng(projectId: string, posterId: string, hungAt: string, url: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('projects')
    .update({ poster_image_url: url })
    .eq('id', projectId)
    .eq('poster_id', posterId)
    .eq('poster_hung_at', hungAt)
    .select('id')
  if (!data?.length) {
    await deleteCloudinaryImages([url])
    return false
  }
  return true
}
