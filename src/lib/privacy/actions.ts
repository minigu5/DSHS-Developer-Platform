'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { cloudinary } from '@/lib/cloudinary'
import { isAllowedEmail } from '@/lib/constants'
import { getDnsClient } from '@/lib/domains/cloudflare'
import { PRIVACY_COOKIE, PRIVACY_COOKIE_OPTIONS, WITHDRAW_CONFIRM_TEXT } from '@/lib/privacy/config'
import { cloudinaryPublicId } from '@/lib/privacy/format'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/version'
import { ONBOARDING_COOKIE_NAME, ONBOARDING_COOKIE_SECURE } from '@/lib/supabase/cookie-options'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type PrivacyResult = { ok: true } | { error: string }

const LOGIN_REQUIRED = '로그인이 필요해요.'
const POLICY_CHANGED = '그사이 처리방침이 바뀌었어요. 페이지를 새로고침해서 다시 읽어 주세요.'
const UNKNOWN_ERROR = '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
const CLOUDINARY_DELETE_BATCH = 100

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

// 탈퇴한 계정의 흔적이 브라우저에 남지 않게 한다. 온보딩 쿠키는 middleware.ts 의 ONBOARDING_COOKIE(운영은 __Host- 접두사) —
// 남겨 두면 같은 브라우저로 새 계정을 만들 때 온보딩(닉네임 입력)이 건너뛰어진다.
// __Host- 쿠키는 Secure·Path=/ 를 붙여야 브라우저가 지우기를 받아들여서 delete() 대신 만료로 덮는다.
async function clearSessionCookies() {
  const cookieStore = await cookies()
  cookieStore.delete(PRIVACY_COOKIE)
  cookieStore.set(ONBOARDING_COOKIE_NAME, '', { maxAge: 0, path: '/', secure: ONBOARDING_COOKIE_SECURE })
}

// 지워진 계정의 이미지를 Cloudinary 에서도 지운다. 실패해도 탈퇴는 이미 끝났으므로 조용히 넘어간다.
async function deleteCloudinaryImages(urls: string[]) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const ids = urls.map((u) => cloudinaryPublicId(u, cloudName)).filter((id): id is string => id !== null)
  for (let i = 0; i < ids.length; i += CLOUDINARY_DELETE_BATCH) {
    try {
      await cloudinary.api.delete_resources(ids.slice(i, i + CLOUDINARY_DELETE_BATCH), { resource_type: 'image' })
    } catch {
      // 이미지 정리는 최선 노력
    }
  }
}

// withdraw_account() 가 한 트랜잭션으로 계정·글·팀원 표시를 정리한다. 이 함수는 service_role 전용.
// 주소 받기(서브도메인)는 withdraw_account() 가 반납하고, DNS 레코드는 여기서 바로 지운다(놓치면 매일 점검이 정리).
async function eraseAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: domains } = await admin
    .from('subdomains')
    .select('cf_record_ids')
    .eq('owner_id', userId)
    .in('status', ['reserved', 'pending', 'active', 'broken'])
  const { data: urls, error } = await admin.rpc('withdraw_account', { p_user_id: userId })
  if (error) return false
  const recordIds = (domains ?? []).flatMap((d) => d.cf_record_ids)
  if (recordIds.length) {
    await getDnsClient()
      .remove(recordIds)
      .catch((e) => console.error('[privacy] 탈퇴한 계정의 DNS 레코드 삭제 실패, 매일 점검이 정리', e))
  }
  await deleteCloudinaryImages(urls ?? [])
  return true
}

/**
 * 동의한다 — 현재 버전의 동의를 기록한다. 이미 있으면 처음 시각을 그대로 둔다.
 * `seenVersion` 은 팝업이 사용자에게 보여 준 버전 — 그사이 처리방침이 바뀌었으면 읽지 않은 글에 동의시키지 않고 거절한다.
 */
export async function acceptPrivacyPolicy(seenVersion: string): Promise<PrivacyResult> {
  const { user } = await currentUser()
  if (!user || !isAllowedEmail(user.email)) return { error: LOGIN_REQUIRED }
  if (seenVersion !== PRIVACY_POLICY_VERSION) return { error: POLICY_CHANGED }

  const { error } = await createAdminClient()
    .from('privacy_consents')
    .upsert(
      { user_id: user.id, policy_version: PRIVACY_POLICY_VERSION },
      { onConflict: 'user_id,policy_version', ignoreDuplicates: true },
    )
  if (error) return { error: UNKNOWN_ERROR }

  const cookieStore = await cookies()
  cookieStore.set(PRIVACY_COOKIE, PRIVACY_POLICY_VERSION, PRIVACY_COOKIE_OPTIONS)
  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * 동의하지 않는다 — 로그아웃한다. 한 번도 동의한 적 없고 닉네임도 없는 새 계정이면(쓴 글이 없다)
 * 개인정보를 갖고 있을 이유가 없으니 계정도 함께 지운다. 이미 쓰던 계정은 남겨 둔다.
 */
export async function declinePrivacyPolicy(): Promise<PrivacyResult> {
  const { supabase, user } = await currentUser()
  if (user) {
    const admin = createAdminClient()
    const [{ data: profile }, { count }] = await Promise.all([
      admin.from('users').select('nickname').eq('id', user.id).maybeSingle(),
      admin.from('privacy_consents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    if (profile && !profile.nickname && !count) {
      if (!(await eraseAccount(user.id))) return { error: UNKNOWN_ERROR }
    }
  }

  await supabase.auth.signOut()
  await clearSessionCookies()
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** 동의 철회 = 탈퇴 — 계정과 내가 쓴 글을 전부 지운다. 되돌릴 수 없어서 확인 문구를 직접 입력받는다. */
export async function withdrawAccount(confirmText: string): Promise<PrivacyResult> {
  if (confirmText.trim() !== WITHDRAW_CONFIRM_TEXT) {
    return { error: `확인 칸에 "${WITHDRAW_CONFIRM_TEXT}"을 그대로 적어 주세요.` }
  }
  const { supabase, user } = await currentUser()
  if (!user) return { error: LOGIN_REQUIRED }

  if (!(await eraseAccount(user.id))) return { error: UNKNOWN_ERROR }

  await supabase.auth.signOut()
  await clearSessionCookies()
  revalidatePath('/', 'layout')
  return { ok: true }
}
