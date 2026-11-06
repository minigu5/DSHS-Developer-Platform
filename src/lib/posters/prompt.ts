// Gemini 에 보내는 지시문·대화. 출발점은 실험 스크립트(docs/superpowers/specs/2026-11-05-ai-poster/spike-reference.mjs)의 SYSTEM.
// 사이트 주소(url)는 보내지 않는다 — 실험에서 가짜 주소를 지어냈고, 띠에 QR 이 있다.

import { POSTER_MESSAGES_SENT, type PosterMessage, type PosterProjectInfo } from './config.ts'

const FENCE = '```'

export const POSTER_SYSTEM = [
  '너는 감각 있는 포스터 디자이너다. 학생이 만든 프로그램을 학교 복도에 붙일 A4 세로 홍보 포스터를 HTML로 만든다.',
  '출력은 정확히 코드 블록 두 개, 이 순서로. 설명 문장은 쓰지 않는다.',
  `1) ${FENCE}json 블록: {"art":{"prompt":"<영어 그림 프롬프트>","width":<그림 자리 가로 px>,"height":<그림 자리 세로 px>}}`,
  '   - 고치기 요청에서 그림을 바꿀 필요가 없으면 json 블록을 빼고 html 블록만 준다.',
  `2) ${FENCE}html 블록: 포스터 전체 HTML.`,
  '규칙:',
  '- 캔버스는 정확히 가로 1240px × 세로 1518px. html, body { margin:0 } 이고 포스터 요소는 width:1240px; height:1518px; overflow:hidden. 이 아래에 플랫폼 띠(QR 포함)가 자동으로 붙으니 QR·띠·사이트 주소·URL은 절대 넣지 말 것.',
  '- 큰 그림은 직접 그리지 말고 <img src="ART" style="width:…px;height:…px;object-fit:cover"> 자리 하나만 둔다. 이 자리의 크기가 json의 width·height와 같아야 한다. 그림 바탕이 흰색 계열이면 mix-blend-mode:multiply 로 배경과 섞어도 좋다.',
  '- 그림 프롬프트(영어): 글자·숫자·로고를 절대 넣지 말라고 적는다(no text, no letters, no numbers, no logos). 서비스 이름의 뜻이나 가장 큰 장점을 은유하는 장면 하나. 밝은 바탕, 플랫 벡터 일러스트, 2~3가지 색. 제목과 겹치는 쪽은 비워 두라고 적는다.',
  '- 외부 리소스는 Google Fonts만(Noto Sans KR, Black Han Sans, Jua, Do Hyeon, Gowun Dodum, IBM Plex Sans KR 중에서). <script> 금지. 작은 장식 도형만 인라인 SVG 허용.',
  '- 글은 헤드라인 한 줄(두 줄까지)과 서비스 이름만. 기능 나열·설명 문단·알약 배지 금지.',
  '- 크림·베이지·금색·어두운 바탕 금지. 포스트잇·손글씨 화살표·이모지 금지. 밝은 바탕에 2~3가지 색.',
  '- 사실만 쓴다. 주어진 정보에 없는 숫자·기능·영문 이름·주소를 지어내지 않는다.',
  '- 고치기 요청에는 HTML 전체를 다시 준다. 부탁받지 않은 부분은 그대로 둔다.',
].join('\n')

export interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export function summarizeDescription(markdown: string, max = 1200): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*`|_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function projectBlock(info: PosterProjectInfo): string {
  return [
    '프로젝트 정보',
    `- 이름: ${info.title}`,
    `- 종류: ${info.types.join(', ') || '없음'}`,
    `- 플랫폼: ${info.platforms.join(', ') || '없음'}`,
    `- 소개(요약): ${info.summary || '없음'}`,
  ].join('\n')
}

export function buildPosterContents({
  info,
  currentHtml,
  recent,
  request,
}: {
  info: PosterProjectInfo
  currentHtml: string | null
  recent: PosterMessage[]
  request: string
}): GeminiContent[] {
  const ask = request.trim()
  if (!currentHtml) {
    return [{ role: 'user', parts: [{ text: `${projectBlock(info)}\n\n학생의 부탁: ${ask || '없음'}` }] }]
  }
  const earlier = recent
    .filter((m) => m.role === 'user' && m.text.trim())
    .slice(-POSTER_MESSAGES_SENT)
    .map((m) => `- ${m.text}`)
  const text = [
    projectBlock(info),
    '',
    `지금 포스터 HTML:\n${FENCE}html\n${currentHtml}\n${FENCE}`,
    earlier.length ? `\n이전 부탁:\n${earlier.join('\n')}` : '',
    `\n이번 부탁: ${ask}`,
  ].join('\n')
  return [{ role: 'user', parts: [{ text }] }]
}
