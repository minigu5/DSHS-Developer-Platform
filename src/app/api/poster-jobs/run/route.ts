import { NextResponse, type NextRequest } from 'next/server'

import { runPosterJob } from '@/lib/posters/ai-jobs'
import { isJobId, POSTER_JOB_SIG_HEADER, verifyPosterJob } from '@/lib/posters/ai-jobs-logic'

// 큐 소비자(custom-worker.ts)만 부르는 내부 경로 — 쿠키 없는 기계 전용이라 isSameOrigin 대신 서명(HMAC, 키 = 서비스 키)으로 연다.
// 소비자가 이 응답을 끝까지 기다리므로(최대 15분) 브라우저 탭과 상관없이 결과가 저장된다.
// 응답 200 = 처리함(이미 누가 잡았어도), 404 = 서명·id 틀림(이유 안 알림). 그 밖의 실패는 소비자가 재시도한다.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { jobId?: unknown }
  const jobId = body.jobId
  if (!isJobId(jobId) || !(await verifyPosterJob(jobId, request.headers.get(POSTER_JOB_SIG_HEADER), process.env.SUPABASE_SERVICE_ROLE_KEY))) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
  await runPosterJob(jobId)
  return NextResponse.json({ ok: true })
}
