// AI HTML 을 sandbox iframe 의 srcdoc 으로 만들기 + 띠까지 합친 내보내기용 한 장 문서.

import { POSTER_BAND_CSS } from './band.ts'
import { POSTER_CANVAS } from './config.ts'

export const POSTER_CSP =
  "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https://res.cloudinary.com data:"

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${POSTER_CSP}">`
// 그림을 아직 못 그렸을 때 자리 — zinc-200 사각형
const EMPTY_ART = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#e4e4e7"/></svg>')}`

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function posterSrcdoc(html: string, artUrl: string | null): string {
  const withArt = html.replace(/\bsrc\s*=\s*(["'])ART\1/gi, `src="${escapeAttr(artUrl ?? EMPTY_ART)}"`)
  return /<head\b[^>]*>/i.test(withArt) ? withArt.replace(/<head\b[^>]*>/i, (m) => m + CSP_META) : CSP_META + withArt
}

export function posterExportPage(srcdoc: string, bandHtml: string): string {
  const total = POSTER_CANVAS.height + POSTER_CANVAS.bandHeight
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans+KR:wght@500;600;700&display=block" rel="stylesheet">
<style>@page { size: ${POSTER_CANVAS.width}px ${total}px; margin: 0 }
html, body { margin: 0 }
#page { width: ${POSTER_CANVAS.width}px; height: ${total}px; display: flex; flex-direction: column; overflow: hidden; background: #fff }
#page iframe { width: ${POSTER_CANVAS.width}px; height: ${POSTER_CANVAS.height}px; border: 0; display: block; flex: none }
${POSTER_BAND_CSS}</style>
</head><body><div id="page"><iframe sandbox="" srcdoc="${escapeAttr(srcdoc)}"></iframe>${bandHtml}</div></body></html>`
}
