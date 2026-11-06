// 포스터 띠만 받기(PNG) — 브라우저 캔버스로 그릴 때 쓰는 크기·문구. 순수 함수.
// 모양은 dshs-band.css 와 같다(높이 236, 좌우 여백 72).

export const BAND_SIZE = { width: 1240, height: 236 } as const

const HINT_MAX = 16

export function bandHint(title: string): string {
  const chars = Array.from(title.trim())
  const name = chars.length > HINT_MAX ? `${chars.slice(0, HINT_MAX).join('')}…` : chars.join('')
  return `‘${name}’ 검색 또는 QR`
}
