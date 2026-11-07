import { NextResponse, type NextRequest } from 'next/server'

import { enqueuePosterJob } from '@/lib/posters/ai-jobs'
import { heartbeatJson } from '@/lib/posters/heartbeat'
import { MAX_REQUEST, POSTER_COPY } from '@/lib/posters/messages'
import { guardPosterRequest, keepAliveAfterDisconnect } from '@/lib/posters/route-guard'
import { runPosterAsk, runSafely, type PosterActor, type PosterAskInput } from '@/lib/posters/run-ai'
import { parsePosterScreenshot, parsePosterStyle } from '@/lib/posters/style'
import { releaseUsage, reserveUsage, UsageLedger } from '@/lib/posters/usage'

// 만들기·고치기: Gemini 가 HTML(+그림 주문)을 주면 그림을 그려 저장한다(run-ai.ts runPosterAsk).
// Gemini 가 12~90초라 Cloudflare Queues 일감으로 넣고 바로 { ok, queued, jobId } — 탭을 닫아도 큐 소비자가 끝까지 한다.
// 큐에 못 넣으면(개발 서버·바인딩 없음·넣기 실패) 예전처럼 heartbeatJson 으로 공백을 흘리며 직접 하고, 끝에 { ok, poster | error }.
export async function POST(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const { poster, access } = guarded
  if (poster.ai_job_id) return NextResponse.json({ ok: false, error: POSTER_COPY.aiBusy }, { status: 409 })

  const body = (await request.json().catch(() => ({}))) as { message?: unknown; style?: unknown; screenshot?: unknown }
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const firstMake = !poster.html
  if (message.length > MAX_REQUEST) return NextResponse.json({ ok: false, error: POSTER_COPY.tooLong }, { status: 400 })
  if (!firstMake && !message) return NextResponse.json({ ok: false, error: POSTER_COPY.empty }, { status: 400 })
  // 스타일·캡처는 처음 만들 때만(고칠 땐 지금 HTML 이 스타일을 지닌다)
  const style = parsePosterStyle(body.style)
  const screenshot = firstMake && style === 'screenshot' ? parsePosterScreenshot(body.screenshot, process.env.CLOUDINARY_CLOUD_NAME) : null
  if (firstMake && style === 'screenshot' && !screenshot) {
    return NextResponse.json({ ok: false, error: POSTER_COPY.needScreenshot }, { status: 400 })
  }

  const reserved = await reserveUsage('text', access.userId)
  if (reserved !== 'ok') {
    const error = reserved === 'user_limit' ? POSTER_COPY.textUserLimit : POSTER_COPY.textSiteLimit
    return NextResponse.json({ ok: false, error }, { status: 429 })
  }

  const actor: PosterActor = { userId: access.userId, project: access.project, shortDescription: access.shortDescription, repoUrl: access.repoUrl }
  const input: PosterAskInput = { message, style, screenshot }
  const queued = await enqueuePosterJob({ kind: 'ask', posterId: poster.id, userId: access.userId, holds: ['text'], input: { actor, ask: input } })
  if (queued === 'busy') {
    await releaseUsage('text', access.userId)
    return NextResponse.json({ ok: false, error: POSTER_COPY.aiBusy }, { status: 409 })
  }
  if (queued) return NextResponse.json({ ok: true, queued: true, jobId: queued.jobId })

  const usage = new UsageLedger(access.userId, ['text'])
  return heartbeatJson(() => runSafely(usage, () => runPosterAsk(poster, actor, input, usage)), undefined, keepAliveAfterDisconnect())
}
