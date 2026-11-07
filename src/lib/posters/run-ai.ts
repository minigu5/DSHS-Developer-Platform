import 'server-only'

import type { ProjectPosterRow } from '@/lib/types'

import type { PosterAccess } from './access'
import { drawPosterArt } from './art'
import { cancelArtJob, enqueueArtJob, macsOnline } from './art-jobs'
import { planArtAction } from './decide'
import { generatePosterReply } from './gemini'
import { POSTER_COPY } from './messages'
import { savePosterState, toPosterView } from './poster-db'
import { buildPosterContents } from './prompt'
import { parsePosterReply } from './reply'
import { withRepoContext } from './repo-context'
import { fetchRepoContext } from './repo-fetch'
import { sanitizePosterHtml } from './sanitize'
import { fillScreenshot, styleMayUseArt, type PosterScreenshot, type PosterStyle } from './style'
import { nextPosterState, type PosterView } from './store'
import type { UsageKind, UsageLedger } from './usage'

// 만들기·고치기·다시 그리기의 실제 작업. 두 길이 같이 쓴다:
// 큐 소비자가 부르는 내부 경로(/api/poster-jobs/run — 탭을 닫아도 끝까지)와, 큐에 못 넣었을 때의 heartbeatJson(예전 방식).
// 횟수는 UsageLedger 로만 잡고 돌려준다 — 큐 일감이 중간에 죽어도 막힘 정리가 남은 것만 한 번 돌려주게.

const SVG_REQUEST = '그림 자리(ART 이미지)를 같은 크기의 인라인 SVG 그림으로 바꿔 줘. 나머지는 그대로 둬.'

export type PosterRunResult = { ok: true; poster: PosterView; notice?: string } | { ok: false; error: string }

// 큐 소비자에겐 로그인 쿠키가 없어서 요청 때 확인한 권한·프로젝트 정보를 일감에 같이 싣는다
export type PosterActor = Pick<PosterAccess, 'userId' | 'project' | 'shortDescription' | 'repoUrl'>

export interface PosterAskInput {
  message: string
  style: PosterStyle
  screenshot: PosterScreenshot | null
}

/** 던지면 남은 횟수를 모두 돌려주고 실패로 — Gemini 를 이미 썼어도 사용자 탓이 아니니 돌려준다 */
export async function runSafely(usage: UsageLedger, run: () => Promise<PosterRunResult>): Promise<PosterRunResult> {
  try {
    return await run()
  } catch (e) {
    console.error('[poster] 작업 실패', String(e).slice(0, 200))
    await usage.releaseAll().catch(() => {})
    return { ok: false, error: POSTER_COPY.failed }
  }
}

/**
 * Gemini 가 HTML(+그림 주문)을 주면 그림을 그려 저장한다. 글 횟수는 부르는 쪽이 미리 잡아 usage 에 넣어 둔다.
 * 학교 Mac 이 살아 있으면 그림 주문을 대기 목록에 넣고 바로 저장(그림은 나중에 채워짐), 아니면 Workers AI 로 그린다.
 */
export async function runPosterAsk(
  poster: ProjectPosterRow,
  actor: PosterActor,
  input: PosterAskInput,
  usage: UsageLedger,
): Promise<PosterRunResult> {
  const { message, style, screenshot } = input
  const firstMake = !poster.html
  // 학교 Mac 이 살아 있는지는 필요할 때 한 번만 묻는다
  let macs: boolean | null = null
  const isMacsOnline = async () => (macs ??= await macsOnline())
  // 처음 만들 땐 그림 횟수를 먼저 잡는다(학교 Mac → Workers AI 순) — 없으면 Gemini 가 큰 그림도 SVG 로 직접 그린다(회색 자리 대신)
  let hold: Extract<UsageKind, 'art' | 'art_local'> | null = null
  let artNotice: string | undefined
  if (firstMake && styleMayUseArt(style)) {
    if ((await isMacsOnline()) && (await usage.reserve('art_local')) === 'ok') hold = 'art_local'
    else if ((await usage.reserve('art')) === 'ok') hold = 'art'
    if (!hold) artNotice = POSTER_COPY.artSvg
  }
  // 처음 만들 때만 공개 GitHub 저장소 내용(설명·토픽·언어·README)을 더한다 — 고칠 땐 이미 만든 HTML 이 있다
  const info =
    firstMake && actor.repoUrl
      ? withRepoContext(actor.project, actor.shortDescription, await fetchRepoContext(actor.repoUrl))
      : actor.project
  const reply = await generatePosterReply(
    buildPosterContents({
      info,
      currentHtml: poster.html,
      recent: poster.messages ?? [],
      request: message,
      artAvailable: !firstMake || !styleMayUseArt(style) || !!hold,
      style,
      screenshot,
    }),
  )
  if (!reply.ok) {
    await usage.releaseAll()
    return { ok: false, error: reply.reason === 'blocked' ? POSTER_COPY.blocked : reply.reason === 'busy' ? POSTER_COPY.busy : POSTER_COPY.failed }
  }
  const parsed = parsePosterReply(reply.text)
  if (!parsed.html) {
    console.error('[poster] html 없음', reply.text.length, JSON.stringify(reply.text.slice(0, 120)), JSON.stringify(reply.text.slice(-120)))
    await usage.releaseAll()
    return { ok: false, error: POSTER_COPY.failed }
  }
  let html = sanitizePosterHtml(screenshot ? fillScreenshot(parsed.html, screenshot) : parsed.html)

  let artUrl = poster.art_url
  let artOrder = poster.art_order
  let notice = artNotice
  let artJobId: string | null = null
  const wantsArt = planArtAction({ html, order: parsed.art }) === 'draw' && !!parsed.art
  // 미리 잡은 그림 횟수를 안 쓰게 됐으면(주문·ART 자리 없음) 돌려준다
  if (hold && !wantsArt) await usage.release(hold)
  if (wantsArt && parsed.art) {
    // 못 그려도 새 주문은 남긴다 — "그림 다시 그리기"가 이 주문으로 그린다
    artOrder = parsed.art
    // 학교 Mac 먼저: 대기 목록에 넣고 옛 그림은 새 그림이 올 때까지 그대로 둔다
    let localHeld = hold === 'art_local'
    let localUserLimit = false
    if (!hold && (await isMacsOnline())) {
      const r = await usage.reserve('art_local')
      localHeld = r === 'ok'
      localUserLimit = r === 'user_limit'
    }
    if (localHeld) {
      artJobId = await enqueueArtJob({ posterId: poster.id, userId: actor.userId, order: parsed.art })
      // 이제 이 횟수는 그림 일감이 맡는다(막히면 releaseJobUsage 가 돌려줌)
      if (artJobId) {
        notice = POSTER_COPY.artDrawing
        await usage.spend('art_local')
      } else await usage.release('art_local')
    }
    if (!artJobId) {
      const artReserved = hold === 'art' ? 'ok' : await usage.reserve('art')
      if (artReserved !== 'ok') {
        notice = localUserLimit ? POSTER_COPY.artLocalUserLimit : artReserved === 'user_limit' ? POSTER_COPY.artUserLimit : POSTER_COPY.artQuota
      } else {
        const art = await drawPosterArt(parsed.art)
        if (art.ok) {
          artUrl = art.url
          await usage.spend('art')
        } else {
          await usage.release('art')
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
  // Gemini 는 이미 썼다 — 저장에 실패해도 글 횟수는 돌려주지 않는다(예전과 같음)
  await usage.spend('text')
  const saved = await savePosterState(poster.id, state)
  if (!saved) {
    if (artJobId) await cancelArtJob(artJobId)
    console.error('[poster] 저장 실패', poster.id)
    return { ok: false, error: POSTER_COPY.failed }
  }
  return { ok: true, poster: toPosterView(saved), notice }
}

/** "그림 다시 그리기"의 Workers AI 길 — 그림 횟수(art)는 부르는 쪽이 미리 잡아 usage 에 넣어 둔다 */
export async function runPosterRedraw(poster: ProjectPosterRow, usage: UsageLedger): Promise<PosterRunResult> {
  const order = poster.art_order
  const html = poster.html
  // 큐에서 기다리는 사이 되돌리기 등으로 그릴 그림이 없어졌을 수 있다
  if (!html || !order || planArtAction({ html, order }) !== 'draw') {
    await usage.releaseAll()
    return { ok: false, error: '다시 그릴 그림이 없어요.' }
  }
  const art = await drawPosterArt(order)
  if (!art.ok) {
    await usage.release('art')
    return { ok: false, error: art.reason === 'quota' ? POSTER_COPY.artQuotaOnly : '그림을 못 그렸어요. 잠시 뒤 다시 눌러 주세요.' }
  }
  await usage.spend('art')
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
}
