import 'server-only'

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

/**
 * 지금 로그인한 사람이 관리자인가 — DB 의 is_admin()(최초 관리자 + admins 표)에 사용자 키로 묻는다.
 * 로그인 확인은 호출한 쪽이 getUser() 로 따로 한다(비로그인이면 false). 한 요청 안에서는 한 번만 묻는다.
 */
export const isAdminUser = cache(async (): Promise<boolean> => {
  const supabase = await createClient()
  const { data } = await supabase.rpc('is_admin')
  return data === true
})
