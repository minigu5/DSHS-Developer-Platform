export type WikiStep = { id: string; body: string }

export type WikiDoc = {
  key: string
  title: string
  steps: WikiStep[]
  extra: unknown | null
}

export type RevisionStats = {
  added: number
  removed: number
  edited: number
  moved: number
  plus: number
  minus: number
  sourceHash?: string
}

/** 고친 기록 목록 한 번에 보여 주는 개수("더 보기" 단위). */
export const HISTORY_PAGE_SIZE = 30
