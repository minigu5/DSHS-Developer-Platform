import type { WikiStep } from './types.ts'

const EMPTY_TITLE = '제목 없는 단계'
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** 단계 본문의 첫 비어 있지 않은 줄에서 헤딩 기호(#)를 뗀 제목. */
export function titleOf(body: string): string {
  for (const line of body.split('\n')) {
    const text = line.trim()
    if (text === '') continue
    const title = text.replace(/^#+\s*/, '').trim()
    return title === '' ? EMPTY_TITLE : title
  }
  return EMPTY_TITLE
}

/** 8자 [a-z0-9] 단계 id. */
export function newStepId(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  let id = ''
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length]
  return id
}

/** 저장소 원본 본문들로 만든 단계 목록. id는 s1..sn. */
export function seedSteps(bodies: string[]): WikiStep[] {
  return bodies.map((body, i) => ({ id: `s${i + 1}`, body }))
}
