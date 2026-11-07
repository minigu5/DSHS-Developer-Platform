// 만들기·고치기·다시 그리기 큐 일감(poster_ai_jobs)의 판단만 모은 순수 함수 — 네트워크·DB 없이 node:test 로 검증한다.
// 서명은 큐 소비자(custom-worker.ts, Next 밖)도 쓰므로 '@/' 경로·server-only 를 import 하지 않는다.

import { signInternal, verifyInternal } from '../internal-sig.ts'
import { POSTER_AI_JOB } from './config.ts'

export type AiJobStatus = 'queued' | 'working' | 'done' | 'failed' | 'expired'
export type AiJobKind = 'ask' | 'redraw'

// 큐 소비자가 부르는 내부 경로. 서명 헤더가 맞을 때만 열린다(브라우저·학생 사이트는 서비스 키를 모른다)
export const POSTER_JOB_PATH = '/api/poster-jobs/run'
export const POSTER_JOB_SIG_HEADER = 'x-poster-job-sig'

/** 일감 id 의 HMAC-SHA256(키 = 서비스 키). 새 비밀값 없이 소비자와 내부 경로가 같은 값을 만든다(Node·Workers 공통) */
export function signPosterJob(jobId: string, secret: string): Promise<string> {
  return signInternal(`poster-job:${jobId}`, secret)
}

export function verifyPosterJob(jobId: string, sig: string | null, secret: string | undefined): Promise<boolean> {
  return verifyInternal(`poster-job:${jobId}`, sig, secret)
}

export function isJobId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

interface StuckJob {
  status: AiJobStatus
  created_at: string
  started_at: string | null
}

/**
 * 돌고 있는 일감이 막혔는지(→ expired 로 정리하고 holds 를 한 번 돌려준다).
 * done·failed·expired 는 이미 끝난 것이라 막힘이 아니다 — 포스터의 ai_job_id 만 비우면 된다.
 */
export function judgeAiJobStuck(job: StuckJob, now: Date): boolean {
  if (job.status === 'queued') return now.getTime() - new Date(job.created_at).getTime() > POSTER_AI_JOB.queueMaxMs
  if (job.status === 'working') {
    const since = new Date(job.started_at ?? job.created_at).getTime()
    return now.getTime() - since > POSTER_AI_JOB.workMaxMs
  }
  return false
}

export function isFinished(status: AiJobStatus): boolean {
  return status === 'done' || status === 'failed' || status === 'expired'
}
