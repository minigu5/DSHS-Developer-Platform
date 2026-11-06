import { NextResponse, type NextRequest } from 'next/server'

import { settleArtJob } from '@/lib/posters/art-jobs'
import { toPosterView } from '@/lib/posters/poster-db'
import { guardPosterRequest } from '@/lib/posters/route-guard'

// 학교 Mac 그림을 기다리는 동안 브라우저가 3초마다 묻는 곳(설계 2026-11-06-poster-mac-art §5-4).
// 막힘 판정·정리도 여기서 한다 — expired·failed 를 받으면 브라우저가 한 번만 redraw { via: 'cloud' } 로 넘어간다.
export async function GET(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const settled = await settleArtJob(guarded.poster)
  return NextResponse.json({ ok: true, status: settled.status, poster: toPosterView(settled.poster) }, { headers: { 'Cache-Control': 'no-store' } })
}
