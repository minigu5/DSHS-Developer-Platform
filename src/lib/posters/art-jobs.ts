import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type { ProjectPosterRow } from '@/lib/types'

import { fitArtSize } from './art-size'
import { judgeStuck } from './art-jobs-logic'
import { POSTER_MAC, type PosterArtOrder } from './config'
import { releaseUsage } from './usage'

// 학교 Mac mini 그림 대기 목록(설계: docs/superpowers/specs/2026-11-06-poster-mac-art-design.md §5-2·§5-4).
// poster_art_jobs·poster_art_workers 는 서비스 키로만 — 부르기 전에 getPosterAccess 로 권한을 확인할 것.

/** 최근 30초 안에 연락한(끊기지 않은) Mac 이 하나라도 있으면 true. 확인 못 하면 false(지금 방식으로) */
export async function macsOnline(): Promise<boolean> {
  const since = new Date(Date.now() - POSTER_MAC.aliveMs).toISOString()
  const { count, error } = await createAdminClient()
    .from('poster_art_workers')
    .select('id', { count: 'exact', head: true })
    .is('revoked_at', null)
    .gt('last_seen_at', since)
  return !error && (count ?? 0) > 0
}

/** 일감을 넣고 id. 포스터의 art_job_id 는 부르는 쪽이 savePosterState 로 기록한다 */
export async function enqueueArtJob(i: { posterId: string; userId: string; order: PosterArtOrder }): Promise<string | null> {
  const { width, height } = fitArtSize(i.order.width, i.order.height)
  const { data, error } = await createAdminClient()
    .from('poster_art_jobs')
    .insert({ poster_id: i.posterId, user_id: i.userId, prompt: i.order.prompt.slice(0, POSTER_MAC.promptMax), width, height })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[poster] art job 넣기 실패', error?.message)
    return null
  }
  return data.id
}

/** 기다리던 일감 취소(되돌리기·새 주문). 아직 아무 Mac 도 안 잡았으면 횟수를 돌려준다 */
export async function cancelArtJob(jobId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: job } = await admin.from('poster_art_jobs').select('status, user_id').eq('id', jobId).maybeSingle()
  if (!job || (job.status !== 'queued' && job.status !== 'working')) return
  const { data: changed } = await admin
    .from('poster_art_jobs')
    .update({ status: 'canceled', finished_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', job.status)
    .select('id')
  if (changed?.length && job.status === 'queued') await releaseUsage('art_local', job.user_id)
}

export type ArtSettleStatus = 'none' | 'pending' | 'done' | 'expired' | 'failed'

/** 포스터가 이 일감을 아직 기다리면 비우고(+ 그림 URL) 바뀐 줄. 이미 다른 요청이 비웠으면 null */
async function clearPosterJob(posterId: string, jobId: string, artUrl?: string): Promise<ProjectPosterRow | null> {
  const { data } = await createAdminClient()
    .from('project_posters')
    .update({ art_job_id: null, ...(artUrl ? { art_url: artUrl } : {}), updated_at: new Date().toISOString() })
    .eq('id', posterId)
    .eq('art_job_id', jobId)
    .select('*')
    .maybeSingle()
  return (data as ProjectPosterRow | null) ?? null
}

/**
 * 기다리는 그림의 지금 상태. 막혔으면(judgeStuck) 일감을 expired 로 확정하고 횟수를 돌려주고 art_job_id 를 비운다.
 * 횟수는 art_job_id 를 실제로 비운 요청만 돌려준다 — 브라우저 GET 과 서버 페이지가 겹쳐도 두 번 돌려주지 않게.
 */
export async function settleArtJob(poster: ProjectPosterRow): Promise<{ status: ArtSettleStatus; poster: ProjectPosterRow }> {
  const jobId = poster.art_job_id
  if (!jobId) return { status: 'none', poster }
  const admin = createAdminClient()
  const { data: job } = await admin
    .from('poster_art_jobs')
    .select('status, user_id, created_at, lease_until, claimed_at, result_url')
    .eq('id', jobId)
    .maybeSingle()

  if (!job || job.status === 'canceled') {
    return { status: 'none', poster: (await clearPosterJob(poster.id, jobId)) ?? { ...poster, art_job_id: null } }
  }
  if (job.status === 'done') {
    // 결과 경로가 포스터를 채우기 전에 끊겼을 때를 위해 여기서도 채운다
    const filled = job.result_url ? await clearPosterJob(poster.id, jobId, job.result_url) : null
    return { status: 'done', poster: filled ?? { ...poster, art_job_id: null, art_url: job.result_url ?? poster.art_url } }
  }

  const macsAlive = job.status === 'queued' ? await macsOnline() : true
  const verdict = judgeStuck({ job, macsAlive, now: new Date() })
  if (!verdict.stuck) return { status: 'pending', poster }

  if (job.status === 'queued' || job.status === 'working') {
    const { data: changed } = await admin
      .from('poster_art_jobs')
      .update({ status: 'expired', finished_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('status', job.status)
      .select('id')
    // 그사이 Mac 이 결과를 올렸거나 잡았다 — 다음 확인에서 다시 본다
    if (!changed?.length) return { status: 'pending', poster }
  }
  const cleared = await clearPosterJob(poster.id, jobId)
  if (cleared && verdict.release) await releaseUsage('art_local', job.user_id)
  return { status: job.status === 'failed' ? 'failed' : 'expired', poster: cleared ?? { ...poster, art_job_id: null } }
}
