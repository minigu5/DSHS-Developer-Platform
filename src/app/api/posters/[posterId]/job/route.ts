import { NextResponse, type NextRequest } from 'next/server'

import { loadAiJobOutcome, settlePosterJob } from '@/lib/posters/ai-jobs'
import { isJobId } from '@/lib/posters/ai-jobs-logic'
import { toPosterView } from '@/lib/posters/poster-db'
import { guardPosterRequest } from '@/lib/posters/route-guard'

// 만들기·고치기 큐 일감을 기다리는 동안 브라우저가 3초마다 묻는 곳(?id=<jobId>). 막힘 정리도 여기서 한다.
// { status: pending | done(notice) | failed(error), poster }
export async function GET(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const id = request.nextUrl.searchParams.get('id')
  const poster = await settlePosterJob(guarded.poster)
  const outcome = await loadAiJobOutcome(poster, isJobId(id) ? id : null)
  return NextResponse.json({ ok: true, ...outcome, poster: toPosterView(poster) }, { headers: { 'Cache-Control': 'no-store' } })
}
