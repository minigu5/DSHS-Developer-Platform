import { NextResponse, type NextRequest } from 'next/server'

import { drawPosterArt } from '@/lib/posters/art'
import { planArtAction } from '@/lib/posters/decide'
import { heartbeatJson } from '@/lib/posters/heartbeat'
import { POSTER_COPY } from '@/lib/posters/messages'
import { savePosterState, toPosterView } from '@/lib/posters/poster-db'
import { guardPosterRequest } from '@/lib/posters/route-guard'
import { nextPosterState } from '@/lib/posters/store'
import { releaseUsage, reserveUsage } from '@/lib/posters/usage'

// "그림 다시 그리기": Gemini 를 거치지 않고 저장된 주문으로 그림만 새로 — 글 횟수는 쓰지 않는다
export async function POST(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const { poster, access } = guarded

  const order = poster.art_order
  if (!poster.html || !order || planArtAction({ html: poster.html, order }) !== 'draw') {
    return NextResponse.json({ ok: false, error: '다시 그릴 그림이 없어요.' }, { status: 400 })
  }
  const reserved = await reserveUsage('art', access.userId)
  if (reserved !== 'ok') {
    return NextResponse.json({ ok: false, error: reserved === 'user_limit' ? POSTER_COPY.artUserLimit : POSTER_COPY.artQuotaOnly }, { status: 429 })
  }
  const html = poster.html

  return heartbeatJson(async () => {
    const art = await drawPosterArt(order)
    if (!art.ok) {
      await releaseUsage('art', access.userId)
      return { ok: false, error: art.reason === 'quota' ? POSTER_COPY.artQuotaOnly : '그림을 못 그렸어요. 잠시 뒤 다시 눌러 주세요.' }
    }
    const state = nextPosterState(poster, {
      html,
      artUrl: art.url,
      artOrder: order,
      userText: '그림 다시 그리기',
      modelText: POSTER_COPY.redrawn,
      now: new Date().toISOString(),
    })
    const saved = await savePosterState(poster.id, state)
    if (!saved) return { ok: false, error: POSTER_COPY.failed }
    return { ok: true, poster: toPosterView(saved) }
  })
}
