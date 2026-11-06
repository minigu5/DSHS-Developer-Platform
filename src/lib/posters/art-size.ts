// Gemini 가 정한 그림 자리 비율 그대로, 넓이만 상한까지 줄여서 Workers AI 에 요청한다(FLUX 는 16의 배수).

import { POSTER_ART_MAX_AREA, POSTER_CANVAS } from './config.ts'

const MIN_SIDE = 256
const DEFAULT = { width: 1240, height: 900 }

const floor16 = (n: number) => Math.max(MIN_SIDE, Math.floor(n / 16) * 16)

export function fitArtSize(width: number, height: number, maxArea: number = POSTER_ART_MAX_AREA): { width: number; height: number } {
  const valid = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
  let w = Math.min(valid ? width : DEFAULT.width, POSTER_CANVAS.width)
  let h = Math.min(valid ? height : DEFAULT.height, POSTER_CANVAS.height)
  if (w * h > maxArea) {
    const s = Math.sqrt(maxArea / (w * h))
    w *= s
    h *= s
  }
  return { width: floor16(w), height: floor16(h) }
}
