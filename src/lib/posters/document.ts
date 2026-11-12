// AI HTML 을 sandbox iframe 의 srcdoc 으로 만들기 + 띠까지 합친 내보내기용 한 장 문서.

import { posterArtDisplayUrl } from './art-url.ts'
import { POSTER_BAND_CSS } from './band.ts'
import { POSTER_CANVAS, type PosterBandPosition } from './config.ts'

export const POSTER_CSP =
  "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https://res.cloudinary.com data:"

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${POSTER_CSP}">`
// 그림을 아직 못 그렸을 때 자리 — zinc-200 사각형
const EMPTY_ART = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#e4e4e7"/></svg>')}`

// 학교 Mac 이 그리는 중일 때 자리 — 같은 회색 + zinc-500 글자(img 안 SVG 라 시스템 글꼴)
const DRAWING_ART = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e4e4e7"/><text x="200" y="158" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#71717a">그림 그리는 중…</text></svg>',
)}`

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 그림은 흰 바탕이 JPG 압축으로 살짝 회색이라 그림 칸 경계가 보였다 — Gemini 가 빠뜨려도 늘 바탕과 섞고(multiply)
// 가장자리 4% 를 투명하게 흐린다. 흰 테두리를 잘라 낸 그림(art-url.ts)이라 칸 비율과 달라서 잘리지 않게 contain.
// 회색 자리(아직 없음·그리는 중)는 그대로 둔다.
const ART_STYLE =
  '<style>img[data-poster-art]{mix-blend-mode:multiply!important;object-fit:contain!important;' +
  '-webkit-mask-image:linear-gradient(to right,transparent,#000 4%,#000 96%,transparent),linear-gradient(to bottom,transparent,#000 4%,#000 96%,transparent);' +
  '-webkit-mask-composite:source-in;' +
  'mask-image:linear-gradient(to right,transparent,#000 4%,#000 96%,transparent),linear-gradient(to bottom,transparent,#000 4%,#000 96%,transparent);' +
  'mask-composite:intersect}</style>'

// artUrl 이 Cloudinary 원본이면 보여 주기용 변환을 끼운다. 내보내기는 이미 변환한 인쇄용 주소를 넘긴다(transformed).
export function posterSrcdoc(html: string, artUrl: string | null, pending = false, transformed = false): string {
  const shown = artUrl && !transformed ? posterArtDisplayUrl(artUrl) : artUrl
  const src = escapeAttr(shown ?? (pending ? DRAWING_ART : EMPTY_ART))
  const withArt = html.replace(/\bsrc\s*=\s*(["'])ART\1/gi, artUrl ? `data-poster-art src="${src}"` : `src="${src}"`)
  const withStyle = !artUrl
    ? withArt
    : /<head\b[^>]*>/i.test(withArt)
      ? withArt.replace(/<head\b[^>]*>/i, (m) => m + ART_STYLE)
      : ART_STYLE + withArt
  // CSP 는 doctype 바로 뒤, 어떤 요소보다 먼저 — head 뒤에 끼우면 AI 가 head 앞에 낸 <img> 가 CSP 없이 먼저 불려 간다(2026-11-12 감사).
  // doctype 앞에 두면 quirks 모드가 되니 doctype(앞의 공백·주석 포함)은 그대로 맨 앞에 남긴다.
  const doctype = withStyle.match(/^(?:\s|<!--[\s\S]*?-->)*<!doctype[^>]*>/i)?.[0] ?? ''
  return doctype + CSP_META + withStyle.slice(doctype.length)
}

export function posterExportPage(srcdoc: string, bandHtml: string, position: PosterBandPosition = 'bottom'): string {
  const total = POSTER_CANVAS.height + POSTER_CANVAS.bandHeight
  const frame = `<iframe sandbox="" srcdoc="${escapeAttr(srcdoc)}"></iframe>`
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans+KR:wght@500;600;700&display=block" rel="stylesheet">
<style>@page { size: ${POSTER_CANVAS.width}px ${total}px; margin: 0 }
html, body { margin: 0 }
#page { width: ${POSTER_CANVAS.width}px; height: ${total}px; display: flex; flex-direction: column; overflow: hidden; background: #fff }
#page iframe { width: ${POSTER_CANVAS.width}px; height: ${POSTER_CANVAS.height}px; border: 0; display: block; flex: none }
${POSTER_BAND_CSS}</style>
</head><body><div id="page">${position === 'top' ? bandHtml + frame : frame + bandHtml}</div></body></html>`
}
