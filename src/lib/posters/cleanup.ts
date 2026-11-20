import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

/**
 * 프로젝트들의 올린 포스터 그림 주소 — 프로젝트 삭제·탈퇴 때 Cloudinary 에서 지우려고
 * 행이 CASCADE 로 사라지기 **전에** 읽는다. 서비스 키로 읽으니 부르는 쪽이 권한을 확인한 뒤에 부를 것.
 */
export async function posterImageUrlsOf(projectIds: string[]): Promise<string[]> {
  if (projectIds.length === 0) return []
  const { data } = await createAdminClient().from('project_posters').select('image_url').in('project_id', projectIds)
  return (data ?? []).map((p) => p.image_url).filter((u): u is string => !!u)
}
