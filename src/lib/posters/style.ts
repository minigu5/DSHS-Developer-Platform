// 포스터 스타일(처음 만들 때 학생이 고름, 사용자 결정 2026-11-07): 알아서 · 사용 예시 · 그림 · 화면 캡처 · 글자.
// 저장하지 않는다 — 고칠 땐 이미 만든 HTML 이 스타일을 지닌다.

export const POSTER_STYLES = ['auto', 'example', 'art', 'screenshot', 'type'] as const
export type PosterStyle = (typeof POSTER_STYLES)[number]

export const POSTER_STYLE_TEXT: Record<PosterStyle, { label: string; hint: string }> = {
  auto: { label: '알아서', hint: '프로젝트에 맞게 AI가 골라요' },
  example: { label: '사용 예시', hint: '넣는 것 → 나오는 것을 화면 카드로' },
  art: { label: '그림', hint: '큰 AI 그림이 주인공' },
  screenshot: { label: '화면 캡처', hint: '올린 캡처를 노트북·폰 틀에' },
  type: { label: '글자', hint: '그림 없이 큰 글자와 색 면' },
}

// 화면 캡처 자리 표시 — 저장 전에 올린 캡처 주소로 바꾼다(그림 ART 와 달리 저장 HTML 에 주소가 들어간다)
export const SHOT_TOKEN = 'SHOT'

export function parsePosterStyle(value: unknown): PosterStyle {
  return POSTER_STYLES.includes(value as PosterStyle) ? (value as PosterStyle) : 'auto'
}

/** 그림 AI 를 쓸 수 있는 스타일 — 처음 만들 때 그림 횟수를 미리 잡을지 */
export function styleMayUseArt(style: PosterStyle): boolean {
  return style === 'auto' || style === 'example' || style === 'art'
}

export interface PosterScreenshot {
  url: string
  // 가로 ÷ 세로 — 노트북(가로)·폰(세로) 틀을 고르는 데 쓴다
  ratio: number
}

/** 사이트에서 올린(우리 Cloudinary) 캡처만 받는다 — 포스터 CSP 도 res.cloudinary.com 만 연다 */
export function parsePosterScreenshot(value: unknown, cloudName: string | undefined): PosterScreenshot | null {
  if (!cloudName || !value || typeof value !== 'object') return null
  const { url, ratio } = value as { url?: unknown; ratio?: unknown }
  if (typeof url !== 'string' || url.length > 500 || !/^[^\s"'<>]+$/.test(url)) return null
  if (!url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)) return null
  const r = typeof ratio === 'number' && Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0.3), 3) : 16 / 10
  return { url, ratio: Math.round(r * 100) / 100 }
}

export function fillScreenshot(html: string, shot: PosterScreenshot): string {
  return html.replace(/\bsrc\s*=\s*(["'])SHOT\1/gi, `src="${shot.url}"`)
}
