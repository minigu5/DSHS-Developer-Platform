// Cloudinary 그림 주소에 변환을 끼운다.
// - 보여 줄 때(posterArtDisplayUrl): 그림 AI 가 물체를 작게 그리고 흰 여백을 크게 남겨 포스터 그림 칸 위아래가 비었다 —
//   흰 테두리를 잘라 내고(e_trim) 5% 씩 흰 여백만 다시 둔다(c_pad).
// - 그림 AI 의 흰 바탕은 살짝 회색이라 multiply 로 섞어도 옅은 사각형이 남았다(받은 PNG에서 보임) — 거의 흰색은 투명으로
//   바꾼다(e_make_transparent, PNG). 물체 속 흰 부분도 투명해지지만 포스터 바탕이 흰색이라 같아 보인다.
// - 내보낼 때(posterArtPrintUrl): PNG·PDF 는 2배(2480px)로 찍는데 그림은 ~1000px 이라 인쇄하면 흐렸다 — Cloudinary AI 확대
//   (e_upscale, 가로세로 4배). 입력이 0.25MP 미만이면 10회, 넘으면 100회로 센다(무료 한 달 25,000회) — 먼저 0.24MP 로 줄였다가
//   키운다. 처음 부르면 423(만드는 중, ~10초), 그 뒤로는 캐시.

import type { PosterArtOrder } from './config.ts'

const UPLOAD = '/image/upload/'
const TRIM = 'e_trim:10/c_pad,w_1.1,h_1.1,b_white/'
const CLEAR_WHITE = 'co_white,e_make_transparent:8/f_png/'
const UPSCALE_INPUT_AREA = 240_000

function insertAfterUpload(url: string, transform: string): string | null {
  const at = url.indexOf(UPLOAD)
  if (!url.startsWith('https://res.cloudinary.com/') || at < 0) return null
  const cut = at + UPLOAD.length
  return url.slice(0, cut) + transform + url.slice(cut)
}

export function posterArtDisplayUrl(artUrl: string): string {
  return insertAfterUpload(artUrl, TRIM + CLEAR_WHITE) ?? artUrl
}

export function posterArtPrintUrl(artUrl: string, order: Pick<PosterArtOrder, 'width' | 'height'> | null): string | null {
  const ratio = order && order.width > 0 && order.height > 0 ? order.width / order.height : 1
  // c_limit 은 w×h 상자 안에 맞추므로 잘라 낸 뒤 비율이 바뀌어도 넓이는 w×h 이하
  const w = Math.floor(Math.sqrt(UPSCALE_INPUT_AREA * ratio))
  const h = Math.floor(Math.sqrt(UPSCALE_INPUT_AREA / ratio))
  // 확대 모델은 흰 바탕일 때 넣고, 투명 처리는 확대한 뒤에
  return insertAfterUpload(artUrl, `${TRIM}c_limit,w_${w},h_${h}/e_upscale/${CLEAR_WHITE}`)
}
