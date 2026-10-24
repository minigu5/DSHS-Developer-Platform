import { newStepId } from '../../../lib/guide-wiki/steps.ts'
import type { WikiStep } from '../../../lib/guide-wiki/types.ts'

export type EditorMode = 'write' | 'split' | 'preview'

export type EditorStep = WikiStep & { gone: boolean }

export type EditorState = {
  /** 편집을 시작한 버전의 단계. 새 단계·고침 표시와 바뀐 점 계산의 기준. */
  original: WikiStep[]
  /** 화면 순서. 원본에 있던 단계를 지우면 gone 으로 자리에 남는다. */
  steps: EditorStep[]
  openId: string | null
  mode: EditorMode
  whole: boolean
  summary: string
}

export type EditorAction =
  | { type: 'insert'; at: number }
  | { type: 'edit'; id: string; body: string }
  | { type: 'remove'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'move'; id: string; dir: -1 | 1 }
  | { type: 'toggle'; id: string }
  | { type: 'mode'; mode: EditorMode }
  | { type: 'whole' }
  | { type: 'summary'; text: string }

export const NEW_STEP_BODY = '## 새 단계\n\n'

export function initEditorState(original: WikiStep[]): EditorState {
  return {
    original,
    steps: original.map((s) => ({ id: s.id, body: s.body, gone: false })),
    openId: null,
    mode: 'split',
    whole: false,
    summary: '',
  }
}

/** 저장할 단계 목록(지운 단계 제외). */
export function liveSteps(state: EditorState): WikiStep[] {
  return state.steps.filter((s) => !s.gone).map((s) => ({ id: s.id, body: s.body }))
}

function isOriginal(state: EditorState, id: string): boolean {
  return state.original.some((s) => s.id === id)
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'insert': {
      const at = Math.max(0, Math.min(action.at, state.steps.length))
      const step: EditorStep = { id: newStepId(), body: NEW_STEP_BODY, gone: false }
      const steps = [...state.steps.slice(0, at), step, ...state.steps.slice(at)]
      // 새 카드의 작성 칸에 바로 포커스가 가야 하므로 미리보기만 보이는 모드는 풀어 준다.
      const mode = state.mode === 'preview' ? 'split' : state.mode
      return { ...state, steps, openId: step.id, mode }
    }
    case 'edit':
      return {
        ...state,
        steps: state.steps.map((s) => (s.id === action.id ? { ...s, body: action.body } : s)),
      }
    case 'remove': {
      const target = state.steps.find((s) => s.id === action.id)
      if (!target || target.gone) return state
      if (state.steps.filter((s) => !s.gone).length <= 1) return state
      const steps = isOriginal(state, action.id)
        ? state.steps.map((s) => (s.id === action.id ? { ...s, gone: true } : s))
        : state.steps.filter((s) => s.id !== action.id)
      return { ...state, steps, openId: state.openId === action.id ? null : state.openId }
    }
    case 'restore':
      return {
        ...state,
        steps: state.steps.map((s) => (s.id === action.id ? { ...s, gone: false } : s)),
      }
    case 'move': {
      const live = state.steps.filter((s) => !s.gone)
      const li = live.findIndex((s) => s.id === action.id)
      if (li === -1) return state
      const lj = li + action.dir
      if (lj < 0 || lj >= live.length) return state
      const a = state.steps.indexOf(live[li])
      const b = state.steps.indexOf(live[lj])
      const steps = state.steps.slice()
      steps[a] = live[lj]
      steps[b] = live[li]
      return { ...state, steps }
    }
    case 'toggle':
      return { ...state, openId: state.openId === action.id ? null : action.id }
    case 'mode':
      return { ...state, mode: action.mode }
    case 'whole':
      return { ...state, whole: !state.whole }
    case 'summary':
      return { ...state, summary: action.text }
  }
}
