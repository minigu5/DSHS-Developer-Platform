// 포스터 아래 "대곽 개발자 플랫폼에서 만나요" 띠 — 우리 코드가 그린다(AI 영역 밖). 원본: docs/superpowers/specs/2026-11-05-ai-poster/dshs-band.css
// 미리보기(PosterBand)와 내보내기(posterExportPage)가 같은 문자열을 쓴다.

import { bandHint } from './band-layout.ts'
import type { PosterBandPosition, PosterTone } from './config.ts'

export const POSTER_BAND_CSS = ".dshs-band {\n  --band-bg: #ffffff;\n  --band-fg: #18181b;\n  --band-muted: #52525b;\n  --band-line: #e4e4e7;\n  --band-qr-bg: #ffffff;\n\n  flex: none;\n  box-sizing: border-box;\n  height: 236px;\n  padding: 0 72px;\n  display: grid;\n  grid-template-columns: auto 1fr auto auto;\n  align-items: center;\n  column-gap: 28px;\n  background: var(--band-bg);\n  color: var(--band-fg);\n  border-top: 2px solid var(--band-line);\n  font-family: \"IBM Plex Sans KR\", \"Pretendard Variable\", system-ui, sans-serif;\n}\n.dshs-band[data-position=\"top\"] {\n  border-top: 0;\n  border-bottom: 2px solid var(--band-line);\n}\n.dshs-band[data-tone=\"dark\"] {\n  --band-bg: #09090b;\n  --band-fg: #fafafa;\n  --band-muted: #a1a1aa;\n  --band-line: #27272a;\n}\n\n.dshs-band p { margin: 0; }\n\n.dshs-band__logo {\n  width: 84px;\n  height: 84px;\n  border-radius: 25px;\n  box-shadow: 0 0 0 2px var(--band-line);\n}\n.dshs-band[data-tone=\"dark\"] .dshs-band__logo {\n  box-shadow: 0 0 0 3px #3f3f46;\n}\n\n.dshs-band__lead {\n  font-size: 36px;\n  font-weight: 700;\n  line-height: 1.2;\n  letter-spacing: -0.02em;\n}\n.dshs-band__sub {\n  margin-top: 10px !important;\n  font-size: 19px;\n  font-weight: 500;\n  line-height: 1.3;\n  color: var(--band-muted);\n}\n.dshs-band__sub b {\n  font-weight: 700;\n  color: var(--band-fg);\n}\n\n.dshs-band__go {\n  text-align: right;\n  padding-right: 4px;\n}\n.dshs-band__url {\n  font-family: \"IBM Plex Mono\", ui-monospace, monospace;\n  font-size: 30px;\n  font-weight: 600;\n  letter-spacing: -0.01em;\n  line-height: 1.1;\n}\n.dshs-band__hint {\n  margin-top: 8px !important;\n  font-size: 16px;\n  font-weight: 500;\n  color: var(--band-muted);\n  white-space: nowrap;\n}\n\n.dshs-band__qr {\n  width: 140px;\n  height: 140px;\n  box-sizing: border-box;\n  padding: 12px;\n  border-radius: 18px;\n  background: var(--band-qr-bg);\n  box-shadow: 0 0 0 2px var(--band-line);\n}\n.dshs-band__qr svg { display: block; width: 100%; height: 100%; }\n"

const LOGO_SVG = "<svg class=\"dshs-band__logo\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect width=\"512\" height=\"512\" rx=\"150\" fill=\"#000000\"/><path d=\"M 190 190 L 110 256 L 190 322\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"48\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M 322 190 L 402 256 L 322 322\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"48\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M 286 130 L 226 382\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"48\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function posterBandHtml({
  title,
  tone,
  position = 'bottom',
  qrSvg,
}: {
  title: string
  tone: PosterTone
  position?: PosterBandPosition
  qrSvg: string
}): string {
  return (
    `<footer class="dshs-band" data-tone="${tone}" data-position="${position}">` +
    LOGO_SVG +
    `<div class="dshs-band__text"><p class="dshs-band__lead">대곽 개발자 플랫폼에서 만나요</p>` +
    `<p class="dshs-band__sub"><b>DSHS Developer Platform</b> · 학생이 만든 프로그램을 한곳에서</p></div>` +
    `<div class="dshs-band__go"><p class="dshs-band__url">dshs.dev</p><p class="dshs-band__hint">${escapeHtml(bandHint(title))}</p></div>` +
    `<div class="dshs-band__qr">${qrSvg}</div></footer>`
  )
}
