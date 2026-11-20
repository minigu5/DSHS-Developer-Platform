// 포스터 설정·타입 — 직접 올린 포스터를 상세에 걸고, 띠를 받는다(AI 포스터 만들기는 2026-11-20 없앴다).

export const POSTER_LIMITS = {
  perProject: 5,
} as const

export type PosterTone = 'light' | 'dark'
// 띠를 포스터 위·아래 어디에 붙일지(사용자 요청 2026-11-06)
export type PosterBandPosition = 'top' | 'bottom'
