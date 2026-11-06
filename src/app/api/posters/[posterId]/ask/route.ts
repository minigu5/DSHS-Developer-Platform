import { NextResponse, type NextRequest } from 'next/server'

import { drawPosterArt } from '@/lib/posters/art'
import { cancelArtJob, enqueueArtJob, macsOnline } from '@/lib/posters/art-jobs'
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
import { releaseUsage, reserveUsage, type UsageKind } from '@/lib/posters/usage'

const SVG_REQUEST = '그림 자리(ART 이미지)를 같은 크기의 인라인 SVG 그림으로 바꿔 줘. 나머지는 그대로 둬.'

// 만들기·고치기: Gemini 가 HTML(+그림 주문)을 주면 그림을 그려 저장한다.
// 학교 Mac 이 살아 있으면 그림 주문을 대기 목록에 넣고 바로 저장(그림은 나중에 채워짐), 아니면 Workers AI 로 그린다.
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
    // 학교 Mac 이 살아 있는지는 필요할 때 한 번만 묻는다
    let macs: boolean | null = null
    const isMacsOnline = async () => (macs ??= await macsOnline())
    // 처음 만들 땐 그림 횟수를 먼저 잡는다(학교 Mac → Workers AI 순) — 없으면 Gemini 가 큰 그림도 SVG 로 직접 그린다(회색 자리 대신)
    let hold: Extract<UsageKind, 'art' | 'art_local'> | null = null
    let artNotice: string | undefined
    if (firstMake) {
      if ((await isMacsOnline()) && (await reserveUsage('art_local', access.userId)) === 'ok') hold = 'art_local'
      else if ((await reserveUsage('art', access.userId)) === 'ok') hold = 'art'
      if (!hold) artNotice = POSTER_COPY.artSvg
    }
    // 처음 만들 때만 공개 GitHub 저장소 내용(설명·토픽·언어·README)을 더한다 — 고칠 땐 이미 만든 HTML 이 있다
    const info =
      firstMake && access.repoUrl
        ? withRepoContext(access.project, access.shortDescription, await fetchRepoContext(access.repoUrl))
        : access.project
    const reply = await generatePosterReply(
      buildPosterContents({ info, currentHtml: poster.html, recent: poster.messages ?? [], request: message, artAvailable: !firstMake || !!hold }),
    )
    if (!reply.ok) {
      await releaseUsage('text', access.userId)
      if (hold) await releaseUsage(hold, access.userId)
      return { ok: false, error: reply.reason === 'blocked' ? POSTER_COPY.blocked : reply.reason === 'busy' ? POSTER_COPY.busy : POSTER_COPY.failed }
    }
    const parsed = parsePosterReply(reply.text)
    if (!parsed.html) {
      console.error('[poster] html 없음', reply.text.length, JSON.stringify(reply.text.slice(0, 120)), JSON.stringify(reply.text.slice(-120)))
      await releaseUsage('text', access.userId)
      if (hold) await releaseUsage(hold, access.userId)
      return { ok: false, error: POSTER_COPY.failed }
    }
    let html = sanitizePosterHtml(parsed.html)

    let artUrl = poster.art_url
    let artOrder = poster.art_order
    let notice = artNotice
    let artJobId: string | null = null
    const wantsArt = planArtAction({ html, order: parsed.art }) === 'draw' && !!parsed.art
    // 미리 잡은 그림 횟수를 안 쓰게 됐으면(주문·ART 자리 없음) 돌려준다
    if (hold && !wantsArt) await releaseUsage(hold, access.userId)
    if (wantsArt && parsed.art) {
      // 못 그려도 새 주문은 남긴다 — "그림 다시 그리기"가 이 주문으로 그린다
      artOrder = parsed.art
      // 학교 Mac 먼저: 대기 목록에 넣고 옛 그림은 새 그림이 올 때까지 그대로 둔다
      let localHeld = hold === 'art_local'
      let localUserLimit = false
      if (!hold && (await isMacsOnline())) {
        const r = await reserveUsage('art_local', access.userId)
        localHeld = r === 'ok'
        localUserLimit = r === 'user_limit'
      }
      if (localHeld) {
        artJobId = await enqueueArtJob({ posterId: poster.id, userId: access.userId, order: parsed.art })
        if (artJobId) notice = POSTER_COPY.artDrawing
        else await releaseUsage('art_local', access.userId)
      }
      if (!artJobId) {
        const artReserved = hold === 'art' ? 'ok' : await reserveUsage('art', access.userId)
        if (artReserved !== 'ok') {
          notice = localUserLimit ? POSTER_COPY.artLocalUserLimit : artReserved === 'user_limit' ? POSTER_COPY.artUserLimit : POSTER_COPY.artQuota
        } else {
          const art = await drawPosterArt(parsed.art)
          if (art.ok) {
            artUrl = art.url
          } else {
            await releaseUsage('art', access.userId)
            notice = art.reason === 'quota' ? POSTER_COPY.artQuota : POSTER_COPY.artFailed
            // 처음 만들 때 Cloudflare 할당량이 바닥났으면(우리 숫자와 어긋날 때) 회색 자리 대신 SVG 로 다시 부탁한다 — 글 횟수는 안 셈
            if (firstMake && !artUrl && art.reason === 'quota') {
              const svg = await generatePosterReply(
                buildPosterContents({ info, currentHtml: html, recent: [], request: SVG_REQUEST, artAvailable: false }),
              )
              const svgHtml = svg.ok ? parsePosterReply(svg.text).html : null
              if (svgHtml) {
                html = sanitizePosterHtml(svgHtml)
                notice = POSTER_COPY.artSvg
              }
            }
          }
        }
      }
    }
    // 새 주문이 왔으면 기다리던 옛 일감은 취소, 글만 고쳤으면 기다리던 그림을 그대로 기다린다
    if (poster.art_job_id && wantsArt) await cancelArtJob(poster.art_job_id)
    const keptJobId = wantsArt ? artJobId : poster.art_job_id

    const done = firstMake ? POSTER_COPY.made : POSTER_COPY.edited
    const state = nextPosterState(poster, {
      html,
      artUrl,
      artOrder,
      artJobId: keptJobId,
      userText: message,
      modelText: notice ? `${done} ${notice}` : done,
      now: new Date().toISOString(),
    })
    const saved = await savePosterState(poster.id, state)
    if (!saved) {
      if (artJobId) await cancelArtJob(artJobId)
      console.error('[poster] 저장 실패', poster.id)
      return { ok: false, error: POSTER_COPY.failed }
    }
    return { ok: true, poster: toPosterView(saved), notice }
  }, undefined, keepAliveAfterDisconnect())
}
