'use server'

// 상세 페이지에 포스터 걸기·내리기. 걸 수 있는 사람 = 포스터 화면에 들어올 수 있는 사람(getBandAccess — 소유자·팀원·관리자, 공개, 차단 아님).
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(actions.ts 와 같은 이유).

import { uploadPosterArtBlob } from './art'
import { getBandAccess } from './access'
import { canHangPoster } from './hang-logic'
import { setHungPoster } from './hang-db'
import { POSTER_COPY } from './messages'
import { loadPoster } from './poster-db'
import { renderPosterFile } from './render'

const UUID = /^[0-9a-f-]{36}$/i

export async function hangPoster(posterId: string): Promise<{ error?: string }> {
  const poster = await loadPoster(posterId)
  if (!poster) return { error: POSTER_COPY.notFound }
  const access = await getBandAccess(poster.project_id)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  if (!canHangPoster(poster)) return { error: '그림이 다 그려진 뒤에 걸 수 있어요.' }

  let imageUrl = poster.image_url
  if (poster.kind === 'ai') {
    // AI 포스터는 HTML 이라 그대로 걸지 않고 띠까지 합친 PNG(1240×1754)를 찍어 올린다 — 받은 바이트는 디코딩하지 않는다
    const file = await renderPosterFile({ poster, title: access.project.title, projectId: access.project.id, format: 'png', scale: 1, printArt: false })
    if (!file.ok) return { error: file.status === 429 ? '포스터를 너무 자주 걸었어요. 10초쯤 뒤에 다시 걸어 주세요.' : '지금은 걸 수 없어요. 잠시 뒤 다시 걸어 주세요.' }
    imageUrl = await uploadPosterArtBlob(await new Response(file.body).blob())
    if (!imageUrl) return { error: '지금은 걸 수 없어요. 잠시 뒤 다시 걸어 주세요.' }
  }
  if (!imageUrl) return { error: POSTER_COPY.notFound }
  const ok = await setHungPoster(poster.project_id, { posterId, imageUrl, isAi: poster.kind === 'ai' })
  return ok ? {} : { error: '걸지 못했어요. 잠시 뒤 다시 해 주세요.' }
}

export async function unhangPoster(projectId: string): Promise<{ error?: string }> {
  if (!UUID.test(projectId)) return { error: POSTER_COPY.noPermission }
  const access = await getBandAccess(projectId)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  const ok = await setHungPoster(projectId, null)
  return ok ? {} : { error: '내리지 못했어요. 잠시 뒤 다시 해 주세요.' }
}
