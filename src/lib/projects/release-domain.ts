import 'server-only'

// 프로젝트를 지우기 전에 살아 있는 주소를 반납한다 — 소유자 삭제(projects/actions.ts)와 관리자 삭제(admin/actions.ts)가 같이 쓴다.
// 'use server' 파일에 두면 누구나 부를 수 있는 서버 액션이 되므로 따로 뺐다.

import { removeCloudflare } from '@/lib/domains/cleanup'
import { refreshAutoIcon } from '@/lib/domains/icon-refresh-server'
import { getNaruClient, unbindNaruBestEffort } from '@/lib/domains/naru'
import { releaseLiveDomainWith } from '@/lib/domains/release'
import type { createAdminClient } from '@/lib/supabase/server'

/**
 * 프로젝트에 살아 있는 주소가 있으면 반납하고 Cloudflare 레코드(바로가기 항목 포함)를 지운다. 없으면 true, 조회·DB 반납이 실패하면 false.
 * `refreshIcon`이면 반납 뒤 자동 아이콘도 되돌아간 방문 주소의 파비콘으로 다시 맞춘다(비공개 전환 — 삭제는 곧 지우니 안 함).
 */
export async function releaseLiveDomain(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  projectId: string,
  reason: string,
  { refreshIcon = false }: { refreshIcon?: boolean } = {},
): Promise<boolean> {
  let name: string | null = null
  const ok = await releaseLiveDomainWith({
    findLive: async () => {
      const { data, error } = await admin
        .from('subdomains')
        .select('id, name, host, naru_server_id, owner_id')
        .eq('project_id', projectId)
        .in('status', ['reserved', 'pending', 'active', 'broken'])
        .maybeSingle()
      name = data?.name ?? null
      return { data: data && { id: data.id, host: data.host, naruServerId: data.naru_server_id, ownerId: data.owner_id }, error }
    },
    release: async (id) => admin.rpc('subdomain_release', { p_actor: actorId, p_id: id, p_reason: reason }),
    removeCloudflare,
    // 대곽나루 서버 주소면 DNS 를 지운 뒤 허브 묶음도 푼다(최선 노력). 주인 이메일은 users 에서 — 반납하는 사람이 관리자일 수 있어서
    unbindNaru: async (live) => {
      const { data: owner } = live.ownerId ? await admin.from('users').select('email').eq('id', live.ownerId).maybeSingle() : { data: null }
      await unbindNaruBestEffort(getNaruClient(), { host: live.host ?? null, naruServerId: live.naruServerId ?? null, ownerEmail: owner?.email ?? null })
    },
    log: (message, detail) => console.error(message, detail),
  })
  if (ok && refreshIcon && name) await refreshAutoIcon(admin, projectId, name)
  return ok
}
