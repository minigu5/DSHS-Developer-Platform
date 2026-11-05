// 관리자 대시보드에서 비속어가 든 글을 빨갛게 표시하고 "오늘 확인할 것"에 올리는 데 쓴다.
// 등록을 막지는 않는다(사용자 결정 — 관리자가 확인). 목록이 놓치는 표현도 있어서 최신 글은 전부 보여 준다.
// 사이에 공백·점·별표 등을 끼운 변형("시 발", "씨.발", "F*U*C*K")도 잡도록 끼움 문자를 지운 문자열에서 찾고,
// 위치는 원문 기준으로 돌려준다.

export type ProfanityHit = { word: string; start: number; end: number }

// 끼움 문자를 지우고 소문자로 바꾼 형태로 적는다. 긴 것을 먼저 맞춰 보도록 정렬해 둔다.
const WORDS = [
  '시발', '씨발', '씨바', '씨빨', '시벌', '씨벌', '씨팔', '시팔', 'ㅅㅂ', 'ㅆㅂ', 'ㅅㅃ',
  '병신', '븅신', '빙신', 'ㅂㅅ',
  '개새끼', '개새기', '개색기', '개색히', '개세끼', '새끼야',
  '좆', '존나', '존내', '졸라', 'ㅈㄴ', 'ㅈ같',
  '지랄', 'ㅈㄹ', '염병', '등신', '썅', '엠창', '느금마', '니애미', '니미럴', '애미뒤진', '미친놈', '미친년', '닥쳐',
  'fuck', 'shit', 'bitch', 'asshole',
].sort((a, b) => b.length - a.length)

// 욕이 아닌데 위 낱말을 품은 표현. 걸린 구간이 이 안에 들어가면 버린다.
const EXCEPTIONS = ['시발점', '시발역', '미시발', '씨발라', '등신대', '시바견']

// 낱말 사이에 끼워 넣어 검사를 피하는 문자
const FILLER = /[\s.,·…*_\-~!@#$%^&+=|/\\'"`?:;()[\]{}<>0-9]/

function normalize(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (FILLER.test(ch)) continue
    norm += ch.toLowerCase()
    map.push(i)
  }
  return { norm, map }
}

export function findProfanity(text: string): ProfanityHit[] {
  const { norm, map } = normalize(text)

  const excepted: [number, number][] = []
  for (const ex of EXCEPTIONS) {
    for (let at = norm.indexOf(ex); at !== -1; at = norm.indexOf(ex, at + 1)) excepted.push([at, at + ex.length])
  }

  const hits: ProfanityHit[] = []
  let i = 0
  while (i < norm.length) {
    const word = WORDS.find((w) => norm.startsWith(w, i))
    if (!word) {
      i++
      continue
    }
    const end = i + word.length
    if (!excepted.some(([s, e]) => s <= i && end <= e)) {
      hits.push({ word, start: map[i], end: map[end - 1] + 1 })
    }
    i = end
  }
  return hits
}

export function hasProfanity(text: string): boolean {
  return findProfanity(text).length > 0
}

export function highlightSegments(text: string): { text: string; hit: boolean }[] {
  const segments: { text: string; hit: boolean }[] = []
  let at = 0
  for (const h of findProfanity(text)) {
    if (h.start > at) segments.push({ text: text.slice(at, h.start), hit: false })
    segments.push({ text: text.slice(h.start, h.end), hit: true })
    at = h.end
  }
  if (at < text.length) segments.push({ text: text.slice(at), hit: false })
  return segments
}
