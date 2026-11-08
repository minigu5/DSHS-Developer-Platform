// AI 포스터 만들기 설정·타입 — 설계: docs/superpowers/specs/2026-11-05-ai-poster-design.md
// 그림 크기·하루 상한 값은 계획 Task 1 실측으로 정한다(docs/superpowers/plans/2026-11-06-ai-poster.md 「실측 결과」).

// 2단계(2026-11-07): 학생에게 열림 — 처리방침(Gemini 위탁)을 같은 배포에 넣었다. 끄면 다시 관리자만.
export const POSTER_OPEN_TO_ALL = true

export function posterAllowed(isAdmin: boolean): boolean {
  return POSTER_OPEN_TO_ALL || isAdmin
}

export const POSTER_LIMITS = {
  perProject: 5,
  textPerUserPerDay: 20,
  textSitePerDay: 200,
  artPerUserPerDay: 5,
  // Workers AI 무료 10,000 neurons/일 ÷ klein 한 장(~1,360) − 여유 1장
  artSitePerDay: 6,
  // 학교 Mac mini 그림(KST 자정) — Mac 처리량을 실측해서 조정(설계 2026-11-06-poster-mac-art §5-5)
  // 우리 Mac 이라 돈이 안 든다 — 바쁘면 줄을 설 뿐(2026-11-08 사용자 결정으로 20·100에서 올림)
  artLocalPerUserPerDay: 50,
  artLocalSitePerDay: 300,
} as const

// 학교 Mac mini 그림 대기 목록의 시간·크기 값(설계 2026-11-06-poster-mac-art). 바꾸면 설계 문서와 posters.md 에도 적는다.
export const POSTER_MAC = {
  // 이 안에 연락한 Mac 이 있으면 "살아 있음"
  aliveMs: 30_000,
  // Mac 이 모두 꺼졌는데 아무도 안 잡은 일감 → 클라우드로
  unclaimedMs: 60_000,
  // Mac 은 살아 있지만 줄이 길 때 최대 기다림(바로 넘기면 Workers AI 하루 6장이 금방 바닥)
  queueMaxMs: 300_000,
  // Mac 이 일감을 쥐는 시간 — DB claim_poster_art_job 의 interval '180 seconds' 와 같게
  leaseMs: 180_000,
  // lease 가 끝난 뒤에도 결과를 받아 주는 시간
  leaseGraceMs: 30_000,
  pollMs: 3_000,
  // 가장 늦은 막힘 판정(줄 5분 + lease + 유예 = 8.5분)보다 길게
  pollStopMs: 540_000,
  maxUploadBytes: 4 * 1024 * 1024,
  promptMax: 1000,
} as const

// 만들기·고치기·다시 그리기 큐 일감(poster_ai_jobs, 2026-11-07). 큐 소비자는 한 번에 최대 15분(Cloudflare Queues).
export const POSTER_AI_JOB = {
  pollMs: 3_000,
  // 큐가 보통 몇 초 안에 넘긴다 — 이만큼 아무도 안 잡았으면 소비자가 고장 난 것
  queueMaxMs: 600_000,
  // 소비자 15분 + 여유 1분. Gemini 3모델 × 150초 + SVG 한 번(최대 10분)보다 길다
  workMaxMs: 960_000,
  // 가장 늦은 막힘 판정보다 길게
  pollStopMs: 1_200_000,
} as const

// 503·404면 다음 모델로(설계 §5)
export const POSTER_TEXT_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.7-flash'] as const
export const POSTER_ART_MODEL = '@cf/black-forest-labs/flux-2-klein-9b'

// AI 영역 1240×1518 + 우리 띠 236 = 1240×1754(A4 세로 비율)
export const POSTER_CANVAS = { width: 1240, height: 1518, bandHeight: 236 } as const
// 그림은 비율을 지키며 이 넓이까지 줄여서 요청한다(무료 할당량 아끼기). 1024×768 = 786,432
export const POSTER_ART_MAX_AREA = 786_432

export const POSTER_VERSIONS_KEPT = 5
export const POSTER_MESSAGES_KEPT = 10
export const POSTER_MESSAGES_SENT = 4

// 저장 HTML 속 그림 자리 표시. 보여 줄 때 art_url 로 바꾼다.
export const ART_TOKEN = 'ART'

export interface PosterArtOrder {
  prompt: string
  width: number
  height: number
}

export interface PosterMessage {
  role: 'user' | 'model'
  text: string
  at: string
}

export interface PosterVersion {
  html: string
  artUrl: string | null
  artOrder: PosterArtOrder | null
  at: string
}

export type PosterTone = 'light' | 'dark'
// 띠를 포스터 위·아래 어디에 붙일지(사용자 요청 2026-11-06)
export type PosterBandPosition = 'top' | 'bottom'

// Gemini 에 보내는 공개 정보만. 이메일·실명·팀원은 넣지 않는다.
export interface PosterProjectInfo {
  id: string
  title: string
  summary: string
  types: string[]
  platforms: string[]
  url: string | null
  // 공개 GitHub 저장소 정보(처음 만들 때만 가져온다, 2026-11-06 사용자 요청)
  repo?: PosterRepoMeta | null
}

export interface PosterRepoMeta {
  description: string | null
  topics: string[]
  language: string | null
}
