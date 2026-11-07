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
  '- 구성(위→아래, 캔버스를 꽉 채운다 — 아무것도 없는 가로 띠가 150px을 넘지 않게):',
  '  ① 서비스 이름: 포인트 색으로 굵게. 이름이 "휩 - LaTeX 변환기"처럼 길면 짧은 이름(휩)만 크게(한두 글자면 120px 이상, 길면 72px 이상) 쓰고 나머지는 그 옆이나 아래에 작게.',
  '  ② 헤드라인: 이 프로그램이 학생에게 주는 이득 한 문장(두 줄까지), 72~96px.',
  '  ③ 큰 그림: 캔버스 면적의 40~50%.',
  '  ④ 장점 3개: 가로로 나란한 칸 3개. 칸마다 작은 인라인 SVG 아이콘(선 굵기 3 이상, 포인트 색) + 굵은 라벨(2~8글자) + 설명 한 줄(12자 이내 — 넘치면 칸에서 두 줄로 꺾여 보기 싫다).',
  '  같은 문구를 두 번 쓰지 않는다(이름·부제·장점끼리 겹치지 않게). 설명 문단·알약 배지 금지.',
  '- 큰 그림은 직접 그리지 말고 <img src="ART" style="width:…px;height:…px;object-fit:cover"> 자리 하나만 둔다. 이 자리의 크기가 json의 width·height와 같아야 한다.',
  '- 그림이 따로 붙인 사진처럼 보이지 않게: 포스터 바탕은 흰색(#ffffff) 단색, 그림 프롬프트에는 "isolated on a pure white background"를 적고, 그림 <img>에 mix-blend-mode:multiply 를 준다(흰 바탕이 포스터와 섞인다). 그림 자리에 테두리·그림자·색 상자를 두지 않는다. 색은 장점 칸·글자·작은 도형에 쓴다.',
  '- 그림 프롬프트(영어, 40~80단어): 서비스의 뜻이나 가장 큰 장점을 은유하는 구체적인 사물 장면 하나(프로그램이 하는 일을 사물로 — 예: 변환이면 두 모양을 이어 주는 기계, 정리면 서랍, 빠름이면 로켓). 수식·코드·글자 적힌 문서·간판·화면 속 UI처럼 글씨가 생기기 쉬운 소재는 쓰지 않는다. 스타일은 "clean flat vector illustration, bold simple shapes, soft subtle shadows", 바탕색 포함 3~4가지 색. 끝에 "wordless illustration, no typography"를 붙인다.',
  '- 글꼴은 Google Fonts의 Noto Sans KR(500·700·900)과 IBM Plex Sans KR(500·700)만. Black Han Sans·Do Hyeon·Jua 같은 두꺼운 장식 글꼴은 인쇄하면 획이 뭉개져서 쓰지 않는다. 한글 제목은 letter-spacing -0.02em~0, line-height 1.25 이상, word-break: keep-all. 본문 글자는 26px 이상.',
  '- 외부 리소스는 Google Fonts만. <script> 금지. 아이콘·작은 장식 도형만 인라인 SVG 허용.',
  '- 크림·베이지·금색·어두운 바탕 금지. 포스트잇·손글씨 화살표·이모지 금지. 흰 바탕에 포인트 색 1~2개(장점 칸은 아주 연한 포인트 색 바탕도 좋다).',
  '- 사실만 쓴다. 주어진 정보에 없는 숫자·기능·영문 이름·주소를 지어내지 않는다. 장점 3개도 주어진 정보에서만 고른다.',
  '- 고치기 요청에는 HTML 전체를 다시 준다. 부탁받지 않은 부분은 그대로 둔다.',
].join('\n')

// 그림 AI 할당량이 없을 때 덧붙인다 — 큰 그림도 SVG 로(실험 때 Gemini SVG 도 포스터 수준은 나왔음)
const NO_ART_NOTE =
  '오늘은 그림 AI를 쓸 수 없다. ART 자리와 json 블록을 쓰지 말고, 큰 그림도 인라인 SVG로 직접 그린다(서비스 이름의 뜻이나 장점을 은유하는 장면 하나, 밝은 바탕, 2~3가지 색).'

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
    ...(info.repo?.description ? [`- 저장소 설명: ${info.repo.description}`] : []),
    ...(info.repo?.topics.length ? [`- 토픽: ${info.repo.topics.join(', ')}`] : []),
    ...(info.repo?.language ? [`- 주 언어: ${info.repo.language}`] : []),
  ].join('\n')
}

export function buildPosterContents({
  info,
  currentHtml,
  recent,
  request,
  artAvailable = true,
}: {
  info: PosterProjectInfo
  currentHtml: string | null
  recent: PosterMessage[]
  request: string
  // 오늘 그림 할당량이 없으면 false — 회색 자리 대신 Gemini 가 SVG 로 직접 그린다
  artAvailable?: boolean
}): GeminiContent[] {
  const ask = request.trim()
  const noArt = artAvailable ? '' : `\n\n${NO_ART_NOTE}`
  if (!currentHtml) {
    return [{ role: 'user', parts: [{ text: `${projectBlock(info)}\n\n학생의 부탁: ${ask || '없음'}${noArt}` }] }]
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
    noArt,
  ].join('\n')
  return [{ role: 'user', parts: [{ text }] }]
}
