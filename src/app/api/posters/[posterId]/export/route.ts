import { NextResponse, type NextRequest } from 'next/server'
import QRCode from 'qrcode'

import { posterArtDisplayUrl, posterArtPrintUrl } from '@/lib/posters/art-url'
import { posterBandHtml } from '@/lib/posters/band'
import { posterExportPage, posterSrcdoc } from '@/lib/posters/document'
import { guardPosterRequest } from '@/lib/posters/route-guard'

// PNG(2480×3508)·PDF(1쪽): 띠까지 합친 HTML 을 Cloudflare Browser Rendering REST 에 보낸다.
// 무료 요금제로 되지만 연속 요청은 429 — 그대로 "잠시 뒤"로 알린다(2026-11-06 실측).
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
    await new Promise((r) => setTimeout(r, 3_000))
  }
  console.error('[poster] 인쇄용 그림 없음', status)
  return posterArtDisplayUrl(artUrl)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const format = request.nextUrl.searchParams.get('format') === 'pdf' ? 'pdf' : 'png'
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const { poster, access } = guarded
  if (!poster.html) return NextResponse.json({ error: '아직 만든 포스터가 없어요.' }, { status: 400 })

  const token = process.env.CLOUDFLARE_BROWSER_API_TOKEN
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!token || !account) return NextResponse.json({ error: '지금은 파일을 만들 수 없어요.' }, { status: 503 })

  const qrSvg = await QRCode.toString(`https://dshs.dev/projects/${access.project.id}`, { type: 'svg', margin: 0 })
  const position = poster.band_position ?? 'bottom'
  const html = posterExportPage(
    posterSrcdoc(poster.html, await printArtUrl(poster.art_url, poster.art_order), false, true),
    posterBandHtml({ title: access.project.title, tone: poster.band_tone, position, qrSvg }),
    position,
  )
  const body =
    format === 'png'
      ? { html, viewport: { width: 1240, height: 1754, deviceScaleFactor: 2 }, gotoOptions: GOTO, waitForTimeout: WAIT_FONTS_MS, screenshotOptions: { type: 'png' } }
      : { html, gotoOptions: GOTO, waitForTimeout: WAIT_FONTS_MS, pdfOptions: { preferCSSPageSize: true, printBackground: true } }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/browser-rendering/${format === 'png' ? 'screenshot' : 'pdf'}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null)
  if (!res?.ok || !res.body) {
    const error = res?.status === 429 ? '파일을 너무 자주 만들었어요. 10초쯤 뒤에 다시 눌러 주세요.' : '지금은 파일을 만들 수 없어요. 잠시 뒤 다시 해 주세요.'
    return NextResponse.json({ error }, { status: 502 })
  }
  const filename = `${access.project.title} 포스터.${format}`
  // 받은 바이트를 그대로 흘려보낸다(디코딩 안 함 — Workers CPU 절약)
  return new Response(res.body, {
    headers: {
      'Content-Type': format === 'png' ? 'image/png' : 'application/pdf',
      'Content-Disposition': `attachment; filename="poster.${format}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
