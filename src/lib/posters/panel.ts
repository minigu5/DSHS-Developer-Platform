'use server'

// 프로젝트 수정 화면 옆 칸(PosterSheet)이 읽는 포스터 목록·스튜디오 데이터. 예전 /projects/[id]/poster 페이지가 서버에서 하던 일.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(actions.ts 와 같은 이유).

import { createAdminClient } from '@/lib/supabase/server'

import { getBandAccess, getPosterAccess } from './access'
import { settlePosterJob } from './ai-jobs'
import { settleArtJob } from './art-jobs'
import { POSTER_LIMITS, type PosterBandPosition, type PosterTone } from './config'
import { canHangPoster, hangState, hungIsStale, type PosterKind } from './hang-logic'
import { kstDate } from './kst'
import { POSTER_COPY } from './messages'
import { loadPoster, toPosterView } from './poster-db'
import type { PosterView } from './store'

const UUID = /^[0-9a-f-]{36}$/i

export interface PosterListItem {
  id: string
  kind: PosterKind
  html: string | null
  artUrl: string | null
  imageUrl: string | null
  tone: PosterTone
  position: PosterBandPosition
  updatedAt: string
  canHang: boolean
  // 이 포스터가 걸린 상태 — 안 걸렸으면 null
  hung: 'hung' | 'rendering' | 'failed' | null
  // 걸린 뒤 고친 AI 포스터 — "다시 걸기"
  stale: boolean
  // 걸린 포스터만 — 만들기 화면이 고친 뒤 "다시 걸기"를 스스로 판단한다(hungIsStale)
  hungAt: string | null
}

export type PosterListResult =
  | {
      ok: true
      title: string
      canUseAi: boolean
      posters: PosterListItem[]
      hasHung: boolean
      full: boolean
      madeToday: boolean
    }
  | { ok: false; error: string }

export type PosterStudioResult =
  | { ok: true; title: string; poster: PosterView; artGaveUp: boolean }
  | { ok: false; error: string }

function accessError(access: 'login' | 'forbidden' | 'not_found'): string {
  return access === 'login' ? '로그인이 풀렸어요. 새로 고침해서 다시 로그인해 주세요.' : POSTER_COPY.noPermission
}

// 띠 받기·포스터 올리기·걸기는 수정할 수 있는 사람 누구나, AI 만들기는 canUseAi 일 때만
export async function getPosterList(projectId: string): Promise<PosterListResult> {
  if (!UUID.test(projectId)) return { ok: false, error: POSTER_COPY.notFound }
  const access = await getBandAccess(projectId)
  if (typeof access === 'string') return { ok: false, error: accessError(access) }

  // 서비스 키 전용 표·칸 — 위에서 권한을 확인했다
  const admin = createAdminClient()
  const [{ data }, { data: madeToday }, { data: project }] = await Promise.all([
    admin
      .from('project_posters')
      .select('id, kind, html, art_url, art_job_id, image_url, band_tone, band_position, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }),
    admin.from('project_poster_days').select('day').eq('project_id', projectId).eq('day', kstDate()).maybeSingle(),
    admin.from('projects').select('poster_id, poster_hung_at, poster_image_url').eq('id', projectId).maybeSingle(),
  ])
  const rows = data ?? []
  const hungId = project?.poster_id ?? null
  // AI 포스터는 걸고 나서 PNG 를 뒤에서 찍는다 — 그동안 "거는 중", 2분 넘게 없으면 "다시 걸기"
  const hung = hungId
    ? hangState({ imageUrl: project?.poster_image_url ?? null, hungAt: project?.poster_hung_at ?? null }, Date.now())
    : null

  return {
    ok: true,
    title: access.project.title,
    canUseAi: access.canUseAi,
    hasHung: !!hungId,
    full: rows.length >= POSTER_LIMITS.perProject,
    madeToday: !!madeToday,
    posters: rows.map((p) => ({
      id: p.id,
      kind: p.kind,
      html: p.html,
      artUrl: p.art_url,
      imageUrl: p.image_url,
      tone: p.band_tone,
      position: p.band_position ?? 'bottom',
      updatedAt: p.updated_at,
      canHang: canHangPoster(p),
      hung: p.id === hungId ? hung : null,
      stale: p.id === hungId && hung === 'hung' && p.kind === 'ai' && hungIsStale(project?.poster_hung_at ?? null, p.updated_at),
      hungAt: p.id === hungId ? (project?.poster_hung_at ?? null) : null,
    })),
  }
}

export async function getPosterStudio(projectId: string, posterId: string): Promise<PosterStudioResult> {
  if (!UUID.test(projectId) || !UUID.test(posterId)) return { ok: false, error: POSTER_COPY.notFound }
  const poster = await loadPoster(posterId)
  // 직접 올린 그림은 스튜디오가 없다 — 열어 두면 AI 로 만들어 '하루 1개'를 피할 수 있다
  if (!poster || poster.project_id !== projectId || poster.kind !== 'ai') return { ok: false, error: POSTER_COPY.notFound }
  const access = await getPosterAccess(projectId)
  if (typeof access === 'string') return { ok: false, error: accessError(access) }
  // 브라우저를 다 닫은 뒤 막힌 학교 Mac 그림이 "그림 다시 그리기"를 계속 막지 않게 열 때 한 번 정리한다
  // 막혀서 정리됐으면 브라우저가 열자마자 한 번 클라우드로 다시 그린다(탭이 열려 있을 때 폴링이 하던 일)
  const settled = poster.art_job_id ? await settleArtJob(poster) : null
  // 큐 일감(만들기·고치기)도 막혔으면 정리하고 횟수를 돌려준다 — 아직 돌고 있으면 스튜디오가 이어서 기다린다
  const current = await settlePosterJob(settled?.poster ?? poster)
  return {
    ok: true,
    title: access.project.title,
    poster: toPosterView(current),
    artGaveUp: settled?.status === 'expired' || settled?.status === 'failed',
  }
}
