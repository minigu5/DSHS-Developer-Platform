import { NextResponse, type NextRequest } from 'next/server'

import { uploadPosterArtBlob } from '@/lib/posters/art'
import { shouldApplyResult, sniffImageType } from '@/lib/posters/art-jobs-logic'
import { authArtWorker } from '@/lib/posters/art-worker-auth'
import { POSTER_MAC } from '@/lib/posters/config'
import { createAdminClient } from '@/lib/supabase/server'

// 학교 Mac 이 그린 그림을 올리는 곳(설계 2026-11-06-poster-mac-art §5-3).
// 쿠키를 쓰지 않는 기계 전용 경로라 isSameOrigin 대상이 아니다 — Mac 토큰 + job secret 으로 확인한다.
// 응답: 200 저장(이미 done 이어도 200) · 404 인증·상태 틀림 · 413 크기 · 415 형식 · 502 Cloudinary 실패(Mac 이 재시도)

const ACCEPTED = new Set(['image/png', 'image/jpeg', 'image/webp'])
const status = (code: number) => NextResponse.json({ ok: code === 200 }, { status: code })

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const auth = await authArtWorker(request, jobId)
  if (!auth) return status(404)
  if (auth.verdict === 'already') return status(200)

  const declared = Number(request.headers.get('content-length'))
  if (!Number.isFinite(declared) || declared <= 0 || declared > POSTER_MAC.maxUploadBytes) return status(413)
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
  if (!ACCEPTED.has(contentType)) return status(415)
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > POSTER_MAC.maxUploadBytes) return status(413)
  const type = sniffImageType(bytes.subarray(0, 12))
  if (!type) return status(415)

  const url = await uploadPosterArtBlob(new Blob([bytes], { type }))
  if (!url) {
    console.error('[poster] art result', jobId, 'upload-failed')
    return status(502)
  }

  const admin = createAdminClient()
  const { data: done } = await admin
    .from('poster_art_jobs')
    .update({ status: 'done', result_url: url, finished_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'working')
    .select('poster_id')
  // 그사이 막힘으로 정리됐거나 취소됐다 — Mac 은 버린다
  if (!done?.length) {
    console.error('[poster] art result', jobId, 'job-changed')
    return status(404)
  }

  const { data: poster } = await admin.from('project_posters').select('art_job_id').eq('id', auth.job.poster_id).maybeSingle()
  if (poster && shouldApplyResult(poster.art_job_id, jobId)) {
    await admin
      .from('project_posters')
      .update({ art_url: url, art_job_id: null, updated_at: new Date().toISOString() })
      .eq('id', auth.job.poster_id)
      .eq('art_job_id', jobId)
  }
  console.log('[poster] art result', jobId, 'done')
  return status(200)
}
