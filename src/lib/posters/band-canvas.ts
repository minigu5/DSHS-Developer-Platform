// 포스터 띠만 PNG 로 — 브라우저 캔버스에 직접 그린다(서버·Browser Rendering 안 씀). 모양은 dshs-band.css 와 같다.
// 글꼴은 사이트가 이미 받는 IBM Plex Sans KR Subset(600·700)·Geist Mono.

import QRCode from 'qrcode'

import { BAND_SIZE, bandHint } from './band-layout'
import type { PosterBandPosition, PosterTone } from './config'

const PLEX = '"IBM Plex Sans KR Subset", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
const MONO = '"Geist Mono", ui-monospace, monospace'
const COLORS = {
  light: { bg: '#ffffff', fg: '#18181b', muted: '#52525b', line: '#e4e4e7', ring: '#e4e4e7' },
  dark: { bg: '#09090b', fg: '#fafafa', muted: '#a1a1aa', line: '#27272a', ring: '#3f3f46' },
} as const

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function drawBandPng({
  title,
  projectId,
  tone,
  position,
  scale = 2,
}: {
  title: string
  projectId: string
  tone: PosterTone
  position: PosterBandPosition
  scale?: number
}): Promise<Blob> {
  const { width: W, height: H } = BAND_SIZE
  const c = COLORS[tone]
  await Promise.all([
    document.fonts.load(`700 36px ${PLEX}`),
    document.fonts.load(`600 19px ${PLEX}`),
    document.fonts.load(`600 30px ${MONO}`),
  ]).catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, W, H)
  // 포스터와 닿는 쪽에 선: 아래 띠면 위에, 위 띠면 아래에
  ctx.fillStyle = c.line
  ctx.fillRect(0, position === 'bottom' ? 0 : H - 2, W, 2)

  // 로고(public/logo.svg 를 그대로 옮김: 512 기준 둥근 검정 사각형 + 흰 </> )
  const L = 84
  const lx = 72
  const ly = (H - L) / 2
  ctx.strokeStyle = c.ring
  ctx.lineWidth = tone === 'dark' ? 6 : 4
  roundRect(ctx, lx, ly, L, L, 25)
  ctx.stroke()
  ctx.fillStyle = '#000000'
  ctx.fill()
  const k = L / 512
  ctx.save()
  ctx.translate(lx, ly)
  ctx.scale(k, k)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 48
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const d of ['M 190 190 L 110 256 L 190 322', 'M 322 190 L 402 256 L 322 322', 'M 286 130 L 226 382']) ctx.stroke(new Path2D(d))
  ctx.restore()

  // 가운데 글
  const tx = lx + L + 28
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = c.fg
  ctx.font = `700 36px ${PLEX}`
  ctx.fillText('대곽 개발자 플랫폼에서 만나요', tx, 79)
  ctx.font = `700 19px ${PLEX}`
  const brand = 'DSHS Developer Platform'
  ctx.fillText(brand, tx, 132)
  const bw = ctx.measureText(brand).width
  ctx.fillStyle = c.muted
  ctx.font = `600 19px ${PLEX}`
  ctx.fillText(' · 학생이 만든 프로그램을 한곳에서', tx + bw, 132)

  // QR
  const Q = 140
  const qx = W - 72 - Q
  const qy = (H - Q) / 2
  roundRect(ctx, qx, qy, Q, Q, 18)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = c.line
  ctx.lineWidth = 2
  ctx.stroke()
  const qr = await loadImage(await QRCode.toDataURL(`https://dshs.dev/projects/${projectId}`, { margin: 0, width: 116 * scale }))
  ctx.drawImage(qr, qx + 12, qy + 12, 116, 116)

  // 오른쪽 주소·안내
  const gx = qx - 28
  ctx.textAlign = 'right'
  ctx.fillStyle = c.fg
  ctx.font = `600 30px ${MONO}`
  ctx.fillText('dshs.dev', gx, 88)
  ctx.fillStyle = c.muted
  ctx.font = `600 16px ${PLEX}`
  ctx.fillText(bandHint(title), gx, 129)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
}
