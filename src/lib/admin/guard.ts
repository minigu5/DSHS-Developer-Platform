import 'server-only'

import { isDeveloper } from '@/lib/constants'
import { createAdminClient, createClient } from '@/lib/supabase/server'

import { banNotice, latestBanUntil } from './ban'

/** 관리자(개발자 계정)면 그 사용자, 아니면 null. getUser() 로 확인한다(getSession 은 쿠키를 검증하지 않음). */
export async function requireAdmin(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isDeveloper(user.email)) return null
  return { id: user.id, email: user.email }
}

/**
 * 차단 중이면 안내 문구, 아니면 null. 서비스 키로 대신 쓰는 서버 액션(위키 저장·주소 받기)이 문구용으로 먼저 본다 —
 * 실제로 막는 건 DB 트리거(user_banned).
 */
export async function banNoticeFor(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: banned } = await admin.rpc('is_banned', { p_uid: userId })
  if (!banned) return null
  // 재가입한 사람은 user_id 없이 이메일 해시로만 걸려 있어서 둘 다 본다
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const { data: hash } = authUser?.user?.email ? await admin.rpc('email_hash', { p_email: authUser.user.email }) : { data: null }
  const { data } = await admin
    .from('user_bans')
    .select('until')
    .or(hash ? `user_id.eq.${userId},email_hash.eq.${hash}` : `user_id.eq.${userId}`)
    .or(`until.is.null,until.gt.${new Date().toISOString()}`)
  return banNotice(latestBanUntil(data ?? []) ?? null)
}
