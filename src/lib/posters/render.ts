import 'server-only'

import QRCode from 'qrcode'

import type { ProjectPosterRow } from '@/lib/types'

import { posterArtDisplayUrl, posterArtPrintUrl } from './art-url'
import { posterBandHtml } from './band'
import { posterExportPage, posterSrcdoc } from './document'

// AI 포스터(띠까지 합친 HTML)를 Cloudflare Browser Rendering REST 로 PNG·PDF 로 찍는다 — 내보내기와 상세 페이지 걸기가 같이 쓴다.
// 무료 요금제로 되지만 연속 요청은 429 — 부르는 쪽이 "잠시 뒤"로 알린다(2026-11-06 실측).
// Google Fonts 가 display=swap 이라 바로 찍으면 대체 글꼴로 나와서 2초 기다린다.
const GOTO = { waitUntil: 'networkidle0', timeout: 30_000 } as const
const WAIT_FONTS_MS = 2_000
// 인쇄용 확대 그림이 처음 만들어지는 동안(423) 기다리는 최대 시간 — 넘으면 원래 그림으로 찍는다
const PRINT_ART_WAIT_MS = 20_000

async function printArtUrl(artUrl: string | null, order: Parameters<typeof posterArtPrintUrl>[1]): Promise<string | null> {
  if (!artUrl) return null
  const big = posterArtPrintUrl(artUrl, order)
  if (!big) return artUrl
  const until = Date.now() + PRINT_ART_WAIT_MS
  let status = 0
  while (Date.now() < until) {
    const res = await fetch(big, { method: 'HEAD', signal: AbortSignal.timeout(8_000) }).catch(() => null)
    if (res?.ok) return big
    status = res?.status ?? 0
    if (status !== 423) break
    await new Promise((r) => setTimeout(r, 1_500))
  }
  console.error('[poster] 인쇄용 그림 없음', status)
  return posterArtDisplayUrl(artUrl)
}

/**
 * 실패하면 상태 코드만 — 429(너무 자주), 503(토큰 없음), 그 밖은 502. 받은 바이트는 디코딩하지 않고 그대로 넘긴다(Workers CPU).
 * scale 2 = 2480×3508(인쇄용), 1 = 1240×1754(상세 페이지에 걸 그림). printArt 면 인쇄용 확대 그림을 기다려 쓴다.
 */
export async function renderPosterFile(i: {
  poster: ProjectPosterRow
  title: string
  projectId: string
  format: 'png' | 'pdf'
  scale: 1 | 2
  printArt: boolean
}): Promise<{ ok: true; body: ReadableStream<Uint8Array> } | { ok: false; status: number }> {
  const { poster } = i
  if (!poster.html) return { ok: false, status: 400 }
  const token = process.env.CLOUDFLARE_BROWSER_API_TOKEN
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!token || !account) return { ok: false, status: 503 }

  const qrSvg = await QRCode.toString(`https://dshs.dev/projects/${i.projectId}`, { type: 'svg', margin: 0 })
  const position = poster.band_position ?? 'bottom'
  const art = i.printArt ? await printArtUrl(poster.art_url, poster.art_order) : poster.art_url ? posterArtDisplayUrl(poster.art_url) : null
  const html = posterExportPage(
    posterSrcdoc(poster.html, art, false, true),
    posterBandHtml({ title: i.title, tone: poster.band_tone, position, qrSvg }),
    position,
  )
  const body =
    i.format === 'png'
      ? { html, viewport: { width: 1240, height: 1754, deviceScaleFactor: i.scale }, gotoOptions: GOTO, waitForTimeout: WAIT_FONTS_MS, screenshotOptions: { type: 'png' } }
      : { html, gotoOptions: GOTO, waitForTimeout: WAIT_FONTS_MS, pdfOptions: { preferCSSPageSize: true, printBackground: true } }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/browser-rendering/${i.format === 'png' ? 'screenshot' : 'pdf'}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null)
  if (!res?.ok || !res.body) {
    if (res) console.error('[poster] Browser Rendering', res.status)
    return { ok: false, status: res?.status === 429 ? 429 : 502 }
  }
  return { ok: true, body: res.body }
}
