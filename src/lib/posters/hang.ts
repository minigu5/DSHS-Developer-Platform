'use server'

// 상세 페이지에 포스터 걸기·내리기. 걸 수 있는 사람 = 포스터 화면에 들어올 수 있는 사람(getBandAccess — 소유자·팀원·관리자, 공개, 차단 아님).
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(actions.ts 와 같은 이유).

import { uploadPosterArtBlob } from './art'
import { getBandAccess } from './access'
import { canHangPoster } from './hang-logic'
import { finishHungPng, setHungPoster, startHangingAi } from './hang-db'
import { POSTER_COPY } from './messages'
import { loadPoster } from './poster-db'
import { renderPosterFile } from './render'
import { keepAliveAfterDisconnect } from './route-guard'

const UUID = /^[0-9a-f-]{36}$/i

export async function hangPoster(posterId: string): Promise<{ error?: string; rendering?: boolean }> {
  const poster = await loadPoster(posterId)
  if (!poster) return { error: POSTER_COPY.notFound }
  const access = await getBandAccess(poster.project_id)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  if (!canHangPoster(poster)) return { error: '그림이 다 그려진 뒤에 걸 수 있어요.' }

  if (poster.kind === 'upload') {
    if (!poster.image_url) return { error: POSTER_COPY.notFound }
    const ok = await setHungPoster(poster.project_id, { posterId, imageUrl: poster.image_url, isAi: false })
    return ok ? {} : { error: '걸지 못했어요. 잠시 뒤 다시 해 주세요.' }
  }

  // AI 포스터는 HTML 이라 띠까지 합친 PNG(1240×1754)를 찍어 건다 — 8~9초 걸려서(사용자 "왜 이렇게 오래") 먼저 걸고 뒤에서 찍는다.
  // 찍는 동안 상세 페이지엔 아직 안 보이고, 포스터 화면이 hangState 로 "거는 중"/"다시 걸기"를 보인다.
  const hungAt = await startHangingAi(poster.project_id, posterId)
  if (!hungAt) return { error: '걸지 못했어요. 잠시 뒤 다시 해 주세요.' }
  const render = async () => {
    const file = await renderPosterFile({ poster, title: access.project.title, projectId: access.project.id, format: 'png', scale: 1, printArt: false })
    if (!file.ok) return
    // 받은 바이트는 디코딩하지 않고 그대로 올린다(Workers CPU)
    const url = await uploadPosterArtBlob(await new Response(file.body).blob())
    if (url) await finishHungPng(poster.project_id, posterId, hungAt, url)
  }
  const keepAlive = keepAliveAfterDisconnect()
  if (keepAlive) keepAlive(render().catch((e) => console.error('[poster] 걸 PNG 찍기 실패', String(e).slice(0, 200))))
  else await render() // 로컬 next dev 처럼 Workers 문맥이 없으면 기다렸다가
  return { rendering: true }
}

export async function unhangPoster(projectId: string): Promise<{ error?: string }> {
  if (!UUID.test(projectId)) return { error: POSTER_COPY.noPermission }
  const access = await getBandAccess(projectId)
  if (typeof access === 'string') return { error: POSTER_COPY.noPermission }
  const ok = await setHungPoster(projectId, null)
  return ok ? {} : { error: '내리지 못했어요. 잠시 뒤 다시 해 주세요.' }
}
