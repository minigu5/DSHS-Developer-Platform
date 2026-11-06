import { NextResponse, type NextRequest } from 'next/server'

import { drawPosterArt } from '@/lib/posters/art'
import { planArtAction } from '@/lib/posters/decide'
import { generatePosterReply } from '@/lib/posters/gemini'
import { heartbeatJson } from '@/lib/posters/heartbeat'
import { MAX_REQUEST, POSTER_COPY } from '@/lib/posters/messages'
import { savePosterState, toPosterView } from '@/lib/posters/poster-db'
import { buildPosterContents } from '@/lib/posters/prompt'
import { parsePosterReply } from '@/lib/posters/reply'
import { withRepoContext } from '@/lib/posters/repo-context'
import { fetchRepoContext } from '@/lib/posters/repo-fetch'
import { guardPosterRequest, keepAliveAfterDisconnect } from '@/lib/posters/route-guard'
import { sanitizePosterHtml } from '@/lib/posters/sanitize'
import { nextPosterState } from '@/lib/posters/store'
import { releaseUsage, reserveUsage } from '@/lib/posters/usage'

// 만들기·고치기: Gemini 가 HTML(+그림 주문)을 주면 주문 비율대로 Workers AI 그림을 그려 저장한다.
// 80~90초 걸려서 heartbeatJson 으로 공백을 흘리며 연결을 유지하고, 끝에 { ok, poster | error } JSON.
export async function POST(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const { poster, access } = guarded

  const body = (await request.json().catch(() => ({}))) as { message?: unknown }
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const firstMake = !poster.html
  if (message.length > MAX_REQUEST) return NextResponse.json({ ok: false, error: POSTER_COPY.tooLong }, { status: 400 })
  if (!firstMake && !message) return NextResponse.json({ ok: false, error: POSTER_COPY.empty }, { status: 400 })

  const reserved = await reserveUsage('text', access.userId)
  if (reserved !== 'ok') {
    const error = reserved === 'user_limit' ? POSTER_COPY.textUserLimit : POSTER_COPY.textSiteLimit
    return NextResponse.json({ ok: false, error }, { status: 429 })
  }

  return heartbeatJson(async () => {
    // 처음 만들 때만 공개 GitHub 저장소 내용(설명·토픽·언어·README)을 더한다 — 고칠 땐 이미 만든 HTML 이 있다
    const info =
      firstMake && access.repoUrl
        ? withRepoContext(access.project, access.shortDescription, await fetchRepoContext(access.repoUrl))
        : access.project
    const reply = await generatePosterReply(
      buildPosterContents({ info, currentHtml: poster.html, recent: poster.messages ?? [], request: message }),
    )
    if (!reply.ok) {
      await releaseUsage('text', access.userId)
      return { ok: false, error: reply.reason === 'blocked' ? POSTER_COPY.blocked : reply.reason === 'busy' ? POSTER_COPY.busy : POSTER_COPY.failed }
    }
    const parsed = parsePosterReply(reply.text)
    if (!parsed.html) {
      console.error('[poster] html 없음', reply.text.length, JSON.stringify(reply.text.slice(0, 120)), JSON.stringify(reply.text.slice(-120)))
      await releaseUsage('text', access.userId)
      return { ok: false, error: POSTER_COPY.failed }
    }
    const html = sanitizePosterHtml(parsed.html)

    let artUrl = poster.art_url
    let artOrder = poster.art_order
    let notice: string | undefined
    if (planArtAction({ html, order: parsed.art }) === 'draw' && parsed.art) {
      // 못 그려도 새 주문은 남긴다 — "그림 다시 그리기"가 이 주문으로 그린다
      artOrder = parsed.art
      const artReserved = await reserveUsage('art', access.userId)
      if (artReserved !== 'ok') {
        notice = artReserved === 'user_limit' ? POSTER_COPY.artUserLimit : POSTER_COPY.artQuota
      } else {
        const art = await drawPosterArt(parsed.art)
        if (art.ok) {
          artUrl = art.url
        } else {
          await releaseUsage('art', access.userId)
          notice = art.reason === 'quota' ? POSTER_COPY.artQuota : POSTER_COPY.artFailed
        }
      }
    }

    const done = firstMake ? POSTER_COPY.made : POSTER_COPY.edited
    const state = nextPosterState(poster, {
      html,
      artUrl,
      artOrder,
      userText: message,
      modelText: notice ? `${done} ${notice}` : done,
      now: new Date().toISOString(),
    })
    const saved = await savePosterState(poster.id, state)
    if (!saved) {
      console.error('[poster] 저장 실패', poster.id)
      return { ok: false, error: POSTER_COPY.failed }
    }
    return { ok: true, poster: toPosterView(saved), notice }
  }, undefined, keepAliveAfterDisconnect())
}
