import { NextResponse, type NextRequest } from 'next/server'

import { authArtWorker } from '@/lib/posters/art-worker-auth'
import { releaseUsage } from '@/lib/posters/usage'
import { createAdminClient } from '@/lib/supabase/server'

// 학교 Mac 이 그리지 못했을 때(설계 2026-11-06-poster-mac-art §5-3). 쿠키 없는 기계 전용 경로라 isSameOrigin 대상이 아니다.
// 일감을 failed 로 바꾸고 art_local 횟수를 돌려준다. 브라우저의 상태 확인이 보고 클라우드로 넘어간다.
export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const auth = await authArtWorker(request, jobId)
  if (!auth || auth.verdict !== 'accept') return NextResponse.json({ ok: false }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : null
  const { data: changed } = await createAdminClient()
    .from('poster_art_jobs')
    .update({ status: 'failed', error: reason, finished_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'working')
    .select('id')
  if (changed?.length) await releaseUsage('art_local', auth.job.user_id)
  console.log('[poster] art fail', jobId)
  return NextResponse.json({ ok: true })
}
