import { createClient } from '@/lib/supabase/client'

/** 브라우저용 — 화면 표시 여부만 정한다. 실제 권한은 서버 액션(requireAdmin)·RLS 가 다시 확인한다. */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data } = await createClient().rpc('is_admin')
  return data === true
}
