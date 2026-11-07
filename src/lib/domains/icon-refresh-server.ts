import 'server-only'

// 반납·회수 서버 액션이 부르는 자동 아이콘 다시 맞추기(icon-refresh.ts). 반납은 이미 끝났으니 실패해도 로그만 남긴다 — 매일 밤 파비콘 동기화가 다시 시도.

import { resolveFavicon } from '@/lib/favicon'
import type { createAdminClient } from '@/lib/supabase/server'
import { refreshAutoIconWith } from './icon-refresh'

export async function refreshAutoIcon(admin: ReturnType<typeof createAdminClient>, projectId: string | null, name: string): Promise<void> {
  if (!projectId) return
  try {
    await refreshAutoIconWith(name, {
      load: async () => {
        const { data, error } = await admin.from('projects').select('icon_type, url, icon_url').eq('id', projectId).maybeSingle()
        if (error) throw error
        return data
      },
      resolve: resolveFavicon,
      update: async (iconUrl) => {
        const { error } = await admin.from('projects').update({ icon_url: iconUrl }).eq('id', projectId)
        if (error) throw error
      },
    })
  } catch (e) {
    console.error('[domains] 반납 뒤 아이콘 다시 맞추기 실패, 매일 밤 동기화가 다시 시도', e)
  }
}
