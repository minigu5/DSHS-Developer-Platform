import 'server-only'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/server'

/**
 * 상세 페이지에 걸린 포스터를 바꾼다(null = 내리기 — DB 트리거 projects_poster_clear 가 나머지 칸을 비움).
 * projects 의 poster_* 칸은 사용자 키로 못 바꾸니 서비스 키로 — 권한 확인(getBandAccess)은 부르는 쪽 몫.
 * 걸린 그림은 올린 포스터 자체라 Cloudinary 에서 지우지 않는다(지우기는 deletePoster).
 */
export async function setHungPoster(projectId: string, hung: { posterId: string; imageUrl: string } | null): Promise<boolean> {
  const { error } = await createAdminClient()
    .from('projects')
    .update(
      hung
        ? { poster_id: hung.posterId, poster_image_url: hung.imageUrl, poster_is_ai: false, poster_hung_at: new Date().toISOString() }
        : { poster_id: null },
    )
    .eq('id', projectId)
  if (error) {
    console.error('[poster] 걸기 실패', error.message)
    return false
  }
  revalidatePath(`/projects/${projectId}`)
  return true
}
