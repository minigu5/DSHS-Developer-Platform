'use server'

// 상세 페이지에 포스터 걸기·내리기. 걸 수 있는 사람 = 포스터 칸에 들어올 수 있는 사람(getBandAccess — 소유자·팀원·관리자, 공개, 차단 아님).
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(actions.ts 와 같은 이유).

import { getBandAccess } from './access'
import { setHungPoster } from './hang-db'
import { POSTER_COPY } from './messages'
import { loadPoster } from './poster-db'

const UUID = /^[0-9a-f-]{36}$/i

export async function hangPoster(posterId: string): Promise<{ error?: string }> {
  const poster = await loadPoster(posterId)
  if (!poster?.image_url) return { error: POSTER_COPY.notFound }
  const access = await getBandAccess(poster.project_id)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  const ok = await setHungPoster(poster.project_id, { posterId, imageUrl: poster.image_url })
  return ok ? {} : { error: '걸지 못했어요. 잠시 뒤 다시 해 주세요.' }
}

export async function unhangPoster(projectId: string): Promise<{ error?: string }> {
  if (!UUID.test(projectId)) return { error: POSTER_COPY.noPermission }
  const access = await getBandAccess(projectId)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  const ok = await setHungPoster(projectId, null)
  return ok ? {} : { error: '내리지 못했어요. 잠시 뒤 다시 해 주세요.' }
}
