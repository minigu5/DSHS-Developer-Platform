import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

import { POSTER_LIMITS } from './config'

// art = Workers AI(UTC 자정), art_local = 학교 Mac mini(KST 자정)
export type UsageKind = 'text' | 'art' | 'art_local'

const LIMITS: Record<UsageKind, { user: number; site: number }> = {
  text: { user: POSTER_LIMITS.textPerUserPerDay, site: POSTER_LIMITS.textSitePerDay },
  art: { user: POSTER_LIMITS.artPerUserPerDay, site: POSTER_LIMITS.artSitePerDay },
  art_local: { user: POSTER_LIMITS.artLocalPerUserPerDay, site: POSTER_LIMITS.artLocalSitePerDay },
}

/** 요청 시작 때 1회 예약. 글은 KST 자정, 그림은 UTC 자정(KST 09:00)에 새 날 — migration 20261106150000 */
export async function reserveUsage(kind: UsageKind, userId: string): Promise<'ok' | 'user_limit' | 'site_limit'> {
  const { data, error } = await createAdminClient().rpc('reserve_ai_usage', {
    p_kind: kind,
    p_user: userId,
    p_user_limit: LIMITS[kind].user,
    p_site_limit: LIMITS[kind].site,
  })
  // 예약을 확인 못 하면 막는 쪽으로 — 무료 키를 넘겨 쓰지 않게
  if (error || !data) return 'site_limit'
  return data
}

/** AI 가 붐비거나 실패해서 결과를 못 줬으면 돌려준다 */
export async function releaseUsage(kind: UsageKind, userId: string): Promise<void> {
  await createAdminClient().rpc('release_ai_usage', { p_kind: kind, p_user: userId })
}
