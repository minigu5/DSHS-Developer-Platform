'use client'

// 로그인한 사람이 차단 중인지 — 글쓰기 화면이 안내를 띄우고 버튼을 잠그는 데 쓴다.
// 실제로 막는 건 DB 트리거(user_banned)라 여기서 못 읽어도(로딩·오류) 막지 않는다.

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export type MyBan = { banned: boolean; until: string | null; loading: boolean }

export function useMyBan(): MyBan {
  const [state, setState] = useState<MyBan>({ banned: false, until: null, loading: true })
  useEffect(() => {
    let alive = true
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        if (alive) setState({ banned: false, until: null, loading: false })
        return
      }
      const { data } = await supabase.rpc('my_ban')
      const row = Array.isArray(data) ? data[0] : null
      if (alive) setState({ banned: Boolean(row), until: row?.until ?? null, loading: false })
    })
    return () => {
      alive = false
    }
  }, [])
  return state
}
