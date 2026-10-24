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
