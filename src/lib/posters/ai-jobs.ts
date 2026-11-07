import 'server-only'

import { getCloudflareContext } from '@opennextjs/cloudflare'

import { createAdminClient } from '@/lib/supabase/server'
import type { Json, ProjectPosterRow } from '@/lib/types'

import { isFinished, judgeAiJobStuck, type AiJobKind, type AiJobStatus } from './ai-jobs-logic'
import { POSTER_COPY } from './messages'
import { loadPoster } from './poster-db'
import { runPosterAsk, runPosterRedraw, runSafely, type PosterActor, type PosterAskInput, type PosterRunResult } from './run-ai'
import { releaseUsage, UsageLedger, type UsageKind } from './usage'

// 만들기·고치기·다시 그리기 큐 일감(poster_ai_jobs, migration 20261107130000).
// 요청 → enqueuePosterJob(일감 + 포스터 ai_job_id + 큐) → 바로 { queued } → 큐 소비자(custom-worker.ts)가
// /api/poster-jobs/run 을 불러 끝까지 기다림 → runPosterJob. 브라우저는 /api/posters/<id>/job 으로 3초마다 확인한다.
// 서비스 키로만 — 부르기 전에 getPosterAccess 로 권한을 확인할 것(runPosterJob 은 서명된 내부 경로에서만).

// cloudflare-env.d.ts 는 두지 않는다(CLAUDE.md) — 쓰는 바인딩만 적는다
interface QueueEnv {
  POSTER_JOBS?: { send(body: { jobId: string }): Promise<unknown> }
}

export interface AskJobInput {
  actor: PosterActor
  ask: PosterAskInput
}

const USAGE_KINDS: readonly UsageKind[] = ['text', 'art', 'art_local']
const toHolds = (value: unknown): UsageKind[] =>
  Array.isArray(value) ? value.filter((k): k is UsageKind => USAGE_KINDS.includes(k as UsageKind)) : []

/**
 * 일감을 넣고 큐로 보낸다. null = 큐를 못 씀(개발 서버·바인딩 없음·넣기 실패) → 부르는 쪽이 heartbeat 로 직접 한다.
 * 'busy' = 그새 다른 일감이 포스터를 잡았다. holds 는 부르는 쪽이 이미 잡은 횟수 — 여기선 돌려주지 않는다.
 */
export async function enqueuePosterJob(i: {
  kind: AiJobKind
  posterId: string
  userId: string
  holds: UsageKind[]
  input: AskJobInput | Record<string, never>
}): Promise<{ jobId: string } | 'busy' | null> {
  // next dev 에는 큐 소비자가 없다(일감이 영영 안 끝남)
  if (process.env.NODE_ENV !== 'production') return null
  let queue: QueueEnv['POSTER_JOBS']
  try {
    queue = (getCloudflareContext().env as unknown as QueueEnv).POSTER_JOBS
  } catch {
    return null
  }
  if (!queue) return null

  const admin = createAdminClient()
  const { data: job, error } = await admin
    .from('poster_ai_jobs')
    .insert({ kind: i.kind, poster_id: i.posterId, user_id: i.userId, holds: i.holds, input: i.input as unknown as Json })
    .select('id')
    .single()
  if (error || !job) {
    console.error('[poster] ai job 넣기 실패', error?.message)
    return null
  }
  const { data: claimed } = await admin
    .from('project_posters')
    .update({ ai_job_id: job.id })
    .eq('id', i.posterId)
    .is('ai_job_id', null)
    .select('id')
  if (!claimed?.length) {
    await admin.from('poster_ai_jobs').delete().eq('id', job.id)
    return 'busy'
  }
  try {
    await queue.send({ jobId: job.id })
  } catch (e) {
    console.error('[poster] 큐 보내기 실패', String(e).slice(0, 200))
    await admin.from('project_posters').update({ ai_job_id: null }).eq('id', i.posterId).eq('ai_job_id', job.id)
    await admin.from('poster_ai_jobs').delete().eq('id', job.id)
    return null
  }
  return { jobId: job.id }
}

/**
 * 큐 소비자가 부른 일감 하나를 끝까지 한다. queued → working 을 조건부로 바꾼 요청만 돌린다(큐 재시도·중복 배달에도 한 번).
 * 잡은 횟수는 holds 에 적어 두고, 끝나면 비운다 — 중간에 죽으면 settlePosterJob 이 남은 것만 한 번 돌려준다.
 */
export async function runPosterJob(jobId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: job } = await admin
    .from('poster_ai_jobs')
    .update({ status: 'working', started_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'queued')
    .select('id, kind, poster_id, user_id, input, holds')
    .maybeSingle()
  if (!job) return

  const usage = new UsageLedger(job.user_id, toHolds(job.holds), async (held) => {
    await admin.from('poster_ai_jobs').update({ holds: held }).eq('id', jobId).eq('status', 'working')
  })
  const poster = await loadPoster(job.poster_id)
  let result: PosterRunResult
  if (!poster || poster.ai_job_id !== jobId) {
    await usage.releaseAll()
    result = { ok: false, error: POSTER_COPY.failed }
  } else if (job.kind === 'ask') {
    const input = job.input as unknown as AskJobInput
    result = await runSafely(usage, () => runPosterAsk(poster, input.actor, input.ask, usage))
  } else {
    result = await runSafely(usage, () => runPosterRedraw(poster, usage))
  }

  await admin
    .from('poster_ai_jobs')
    .update({
      status: result.ok ? 'done' : 'failed',
      result: result.ok ? { notice: result.notice ?? null } : { error: result.error },
      holds: [],
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'working')
  await admin.from('project_posters').update({ ai_job_id: null }).eq('id', job.poster_id).eq('ai_job_id', jobId)
}

/** 포스터가 이 일감을 아직 가리키면 비우고 바뀐 줄. 이미 다른 요청이 비웠으면 ai_job_id 만 비운 사본 */
async function clearPosterAiJob(poster: ProjectPosterRow, jobId: string): Promise<ProjectPosterRow> {
  const { data } = await createAdminClient()
    .from('project_posters')
    .update({ ai_job_id: null })
    .eq('id', poster.id)
    .eq('ai_job_id', jobId)
    .select('*')
    .maybeSingle()
  return (data as ProjectPosterRow | null) ?? { ...poster, ai_job_id: null }
}

/**
 * 돌고 있는 일감 정리. 끝났는데 포스터가 아직 가리키면 비우고, 막혔으면(judgeAiJobStuck) expired 로 확정하며
 * holds 를 한 번만 돌려준다 — status 조건부 update 를 이긴 요청만(브라우저 확인과 서버 페이지가 겹쳐도 한 번).
 */
export async function settlePosterJob(poster: ProjectPosterRow): Promise<ProjectPosterRow> {
  const jobId = poster.ai_job_id
  if (!jobId) return poster
  const admin = createAdminClient()
  const { data: job } = await admin
    .from('poster_ai_jobs')
    .select('status, created_at, started_at')
    .eq('id', jobId)
    .maybeSingle()
  if (!job || isFinished(job.status as AiJobStatus)) return clearPosterAiJob(poster, jobId)
  if (!judgeAiJobStuck({ ...job, status: job.status as AiJobStatus }, new Date())) return poster

  const now = new Date().toISOString()
  const { data: expired } = await admin
    .from('poster_ai_jobs')
    .update({ status: 'expired', usage_released_at: now, finished_at: now, result: { error: POSTER_COPY.aiStuck } })
    .eq('id', jobId)
    .eq('status', job.status)
    .is('usage_released_at', null)
    .select('user_id, holds')
    .maybeSingle()
  // 그사이 끝났거나 다른 요청이 정리했다 — 다음 확인에서 다시 본다
  if (!expired) return poster
  console.error('[poster] ai job 막힘 정리', jobId, job.status)
  for (const kind of toHolds(expired.holds)) await releaseUsage(kind, expired.user_id)
  return clearPosterAiJob(poster, jobId)
}

export type AiJobOutcome = { status: 'pending' } | { status: 'done'; notice?: string } | { status: 'failed'; error: string }

/** 브라우저가 기다리던 일감의 결과. 포스터가 아직 일감을 가리키면 pending(settlePosterJob 뒤에 부를 것) */
export async function loadAiJobOutcome(poster: ProjectPosterRow, jobId: string | null): Promise<AiJobOutcome> {
  if (poster.ai_job_id) return { status: 'pending' }
  if (!jobId) return { status: 'done' }
  const { data: job } = await createAdminClient()
    .from('poster_ai_jobs')
    .select('status, result')
    .eq('id', jobId)
    .eq('poster_id', poster.id)
    .maybeSingle()
  if (!job) return { status: 'done' }
  const result = (job.result ?? {}) as { notice?: string | null; error?: string }
  if (job.status === 'done') return { status: 'done', notice: result.notice ?? undefined }
  if (job.status === 'failed' || job.status === 'expired') return { status: 'failed', error: result.error ?? POSTER_COPY.failed }
  // ai_job_id 는 비었는데 일감은 아직 돌고 있다 — 큐 넣기 실패로 지워졌거나 막혀서 정리된 직후
  return { status: 'pending' }
}
