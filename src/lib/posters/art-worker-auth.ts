import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import type { PosterArtJobRow } from '@/lib/types'

import { hashToken, judgeResult, parseBearer } from './art-jobs-logic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 학교 Mac 의 결과·실패 요청 확인: Bearer Mac 토큰(끊기지 않음) + X-Job-Secret(claim 때 받은 값) + 그 Mac 이 잡은 일감.
 * 하나라도 틀리면 null — 라우트는 무엇이 틀렸는지 알리지 않고 같은 404.
 */
export async function authArtWorker(
  request: Request,
  jobId: string,
): Promise<{ job: PosterArtJobRow; workerId: string; verdict: 'accept' | 'already' } | null> {
  if (!UUID.test(jobId)) return null
  const token = parseBearer(request.headers.get('authorization'))
  const secret = request.headers.get('x-job-secret')
  if (!token || token.length < 32 || token.length > 200 || !secret || secret.length > 200) return null
  const admin = createAdminClient()
  const [{ data: worker }, { data: job }] = await Promise.all([
    admin.from('poster_art_workers').select('id').eq('token_hash', await hashToken(token)).is('revoked_at', null).maybeSingle(),
    admin.from('poster_art_jobs').select('*').eq('id', jobId).maybeSingle(),
  ])
  if (!worker || !job) return null
  const verdict = judgeResult({ job, workerId: worker.id, secretHash: await hashToken(secret), now: new Date() })
  return verdict === 'reject' ? null : { job, workerId: worker.id, verdict }
}
