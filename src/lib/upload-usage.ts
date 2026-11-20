import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

// 이미지 올리기(Cloudinary 용량) 하루 몫 — KST 자정. DB 함수 reserve_ai_usage·release_ai_usage 를 그대로 쓴다(이름만 옛것).
const UPLOAD_LIMIT = { user: 60, site: 1000 }

/** 요청 시작 때 1회 예약 */
export async function reserveUsage(kind: 'upload', userId: string): Promise<'ok' | 'user_limit' | 'site_limit'> {
  const { data, error } = await createAdminClient().rpc('reserve_ai_usage', {
    p_kind: kind,
    p_user: userId,
    p_user_limit: UPLOAD_LIMIT.user,
    p_site_limit: UPLOAD_LIMIT.site,
  })
  // 예약을 확인 못 하면 막는 쪽으로
  if (error || !data) return 'site_limit'
  return data
}

/** 올리기가 실패해서 결과를 못 줬으면 돌려준다 */
export async function releaseUsage(kind: 'upload', userId: string): Promise<void> {
  await createAdminClient().rpc('release_ai_usage', { p_kind: kind, p_user: userId })
}
