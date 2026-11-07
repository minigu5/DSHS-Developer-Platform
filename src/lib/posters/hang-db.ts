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
  revalidatePath(`/projects/${projectId}/poster`)
  return true
}
