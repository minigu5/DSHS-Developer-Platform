import 'server-only'

import { isDeveloper } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

/** 관리자(개발자 계정)면 그 사용자, 아니면 null. getUser() 로 확인한다(getSession 은 쿠키를 검증하지 않음). */
export async function requireAdmin(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isDeveloper(user.email)) return null
  return { id: user.id, email: user.email }
}
