// Gemini 에 보내는 지시문·대화. 출발점은 실험 스크립트(docs/superpowers/specs/2026-11-05-ai-poster/spike-reference.mjs)의 SYSTEM.
// 사이트 주소(url)는 보내지 않는다 — 실험에서 가짜 주소를 지어냈고, 띠에 QR 이 있다.

import { POSTER_MESSAGES_SENT, type PosterMessage, type PosterProjectInfo } from './config.ts'
import { SHOT_TOKEN, type PosterScreenshot, type PosterStyle } from './style.ts'

const FENCE = '```'

export const POSTER_SYSTEM = [
  '너는 감각 있는 포스터 디자이너다. 학생이 만든 프로그램을 학교 복도에 붙일 A4 세로 홍보 포스터를 HTML로 만든다.',
  '출력은 코드 블록, 이 순서로. 설명 문장은 쓰지 않는다.',
  `1) ${FENCE}json 블록(그림 AI가 그릴 그림이 있을 때만): {"art":{"prompt":"<영어 그림 프롬프트>","width":<그림 자리 가로 px>,"height":<그림 자리 세로 px>}}`,
  '   - 그림 자리(ART)가 없는 포스터이거나, 고치기 요청에서 그림을 바꿀 필요가 없으면 json 블록을 빼고 html 블록만 준다.',
  `2) ${FENCE}html 블록: 포스터 전체 HTML.`,
  '규칙:',
  '- 캔버스는 정확히 가로 1240px × 세로 1518px. html, body { margin:0 } 이고 포스터 요소는 width:1240px; height:1518px; overflow:hidden. 이 아래에 플랫폼 띠(QR 포함)가 자동으로 붙으니 QR·띠·사이트 주소·URL은 절대 넣지 말 것.',
  '- 구성(위→아래, 캔버스를 꽉 채운다 — 아무것도 없는 가로 띠가 150px을 넘지 않게). 포스터 요소는 display:flex; flex-direction:column, 좌우 여백은 똑같이(예: padding 0 96px), 장점 줄 밑 여백은 72px 정도만. ③ 영역 높이는 1518에서 위 여백·이름·헤드라인·장점 줄·아래 여백·사이 간격을 뺀 값으로 계산한다(보통 640~780px):',
  '  ① 서비스 이름: 포인트 색으로 굵게. 이름이 "휩 - LaTeX 변환기"처럼 길면 짧은 이름(휩)만 크게(한두 글자면 120px 이상, 길면 72px 이상) 쓰고 나머지는 그 옆이나 아래에 작게(배지·알약 모양 말고 그냥 글자로).',
  '  ② 헤드라인: 이 프로그램이 학생에게 주는 이득 한 문장(두 줄까지), 72~96px.',
  '  ③ 주인공: 학생이 고른 스타일대로(처음 만들 때 알려 준다). 고칠 땐 지금 포스터의 ③을 유지한다.',
  '  ④ 장점 2~3개: display:grid; grid-template-columns:repeat(<개수>,1fr); gap 24px 로 콘텐츠 폭을 꽉 채운다(한쪽으로 쏠리지 않게). 칸마다 작은 인라인 SVG 아이콘(선 굵기 3 이상, 포인트 색) + 굵은 라벨(2~8글자) + 설명 한 줄(12자 이내 — 넘치면 칸에서 두 줄로 꺾여 보기 싫다).',
  '  같은 문구를 두 번 쓰지 않는다(이름·부제·장점끼리 겹치지 않게). 설명 문단·알약 배지 금지.',
  '- 그림 AI 그림은 직접 그리지 말고 <img src="ART" style="width:…px;height:…px;object-fit:contain"> 자리 하나만 둔다. 이 자리의 크기가 json의 width·height와 같아야 한다.',
  '- 그림이 따로 붙인 사진처럼 보이지 않게: 포스터 바탕은 흰색(#ffffff) 단색, 그림 <img>에 mix-blend-mode:multiply 를 준다. 그림 자리에 테두리·그림자·색 상자를 두지 않는다.',
  '- 그림 프롬프트(영어) 공통: "isolated on a pure white background", "large centered subject filling most of the frame". 글씨가 생기기 쉬운 것(화면·종이 위 글줄·간판·수식·코드)은 그리지 않거나 빈 면으로. 끝에 "wordless, no typography"를 붙인다.',
  '- 글꼴은 Google Fonts의 Noto Sans KR(500·700·900)과 IBM Plex Sans KR(500·700), 코드·수식만 IBM Plex Mono(500·600). Black Han Sans·Do Hyeon·Jua 같은 두꺼운 장식 글꼴은 인쇄하면 획이 뭉개져서 쓰지 않는다. 한글 제목은 letter-spacing -0.02em~0, line-height 1.25 이상, word-break: keep-all. 본문 글자는 26px 이상.',
  '- 외부 리소스는 Google Fonts만. <script> 금지. 아이콘·장식 도형은 인라인 SVG 허용.',
  '- 크림·베이지·금색·어두운 바탕 금지. 포스트잇·손글씨 화살표·이모지 금지. 흰 바탕에 포인트 색 1~2개(장점 칸은 아주 연한 포인트 색 바탕도 좋다).',
  '- 사실만 쓴다. 주어진 정보에 없는 숫자·기능·영문 이름·주소를 지어내지 않는다. 장점도 주어진 정보에서만 고르고, 정보가 적어 3개를 못 채우면 2개만 둔다(같은 말을 바꿔 쓰거나 지어내서 채우지 않는다).',
  '- 정보에 없는 꾸밈말(완벽·최고·최초·빠른·쉬운·손쉽게·간편한·강력한 등)은 쓰지 않는다. 이름·영문 낱말은 대소문자를 바꾸지 않는다(LaTeX를 LATEX로 쓰거나 text-transform:uppercase 금지). 플랫폼은 있는 그대로 적는다(예: 웹사이트면 "웹 브라우저에서 바로", "모든 기기 완벽 지원" 같은 과장 금지).',
  '- 고치기 요청에는 HTML 전체를 다시 준다. 부탁받지 않은 부분은 그대로 둔다.',
].join('\n')

// 처음 만들 때 학생이 고른 스타일(style.ts)에 따라 ③을 이렇게 만든다
const STYLE_EXAMPLE =
  '③ 사용 예시 카드 + 장식 그림. 카드는 HTML/CSS로 그린 앱 화면(흰 바탕, 둥근 모서리 28px 이상, 연한 테두리와 부드러운 그림자, 맨 위에 창 점 3개 정도). 안에 이 프로그램을 쓰는 장면 하나를 "넣는 것 → 나오는 것"으로 보여 준다(두 칸 사이에 굵은 화살표). 예: 변환기면 왼쪽에 실제 입력 예시, 오른쪽에 변환 결과. 예시 값은 주어진 정보에 나온 것이나 누가 봐도 예시인 값(곡 A·곡 B, x^2 같은)만 쓰고 지어낸 기능을 보여 주지 않는다. 코드·수식은 IBM Plex Mono 30px 이상, 칸마다 작은 라벨(입력·결과 등). 카드가 ③ 영역 폭의 70~85%·높이의 60% 이상을 차지하고(카드 위아래가 휑하지 않게), 장식 그림(ART, 360~520px 정사각형에 가깝게)은 카드 한쪽 모서리 뒤나 옆에 살짝 겹쳐(position:absolute, 카드보다 아래 z-index) 카드보다 작게 둔다. 그림 프롬프트(30~60단어): 이 프로그램을 쓰는 학생 곁에 있을 법한 익숙한 물건 1~3개(수식·문서 도구면 연필과 공책·안경, 음악이면 헤드폰과 레코드판, 일정이면 탁상 달력과 알람시계)를 귀엽게 모은 장면, "soft 3D render, cute rounded objects, glossy clay material, gentle studio lighting", 포인트 색과 어울리는 2~3가지 색. 추상적인 기계·도형·빛나는 선은 쓰지 않는다.'
const STYLE_ART =
  '③ 큰 그림(ART) 하나가 주인공. ③ 영역 높이·콘텐츠 폭에 맞춰 그림 자리 크기를 정한다(json에도 같은 값). 그림 프롬프트(40~80단어): 서비스의 뜻이나 가장 큰 장점을 은유하는 구체적인 사물 장면 하나(음악이면 레코드판, 정리면 서랍, 빠름이면 로켓처럼 누구나 알아보는 사물), "compact composition as tall as it is wide", "clean flat vector illustration, bold simple shapes, soft subtle shadows", 포인트 색 포함 3~4가지 색. 추상적인 기계·도형만 있는 장면은 쓰지 않는다.'
const STYLE_TYPE =
  '③ 그림 없이 글자와 색 면으로. ART 자리와 json 블록을 쓰지 않는다. 헤드라인의 핵심 낱말 1~3개를 아주 크게(160~240px) 쌓고, 포인트 색의 큰 면(둥근 사각형·원·띠)과 굵은 인라인 SVG 도형을 겹쳐 ③ 영역을 꽉 채운다. 색 면 위 글자는 흰색, 대비가 충분하게.'
const STYLE_AUTO =
  '③은 이 프로젝트에 가장 잘 맞는 것 하나를 골라 만든다. 도구·변환기·CLI·라이브러리·확장 프로그램처럼 넣으면 결과가 나오는 프로그램이면 [사용 예시], 게임·음악·취미·소개 사이트처럼 분위기가 중요하면 [그림], 정보가 아주 적고 이름·문구가 강하면 [글자].\n[사용 예시] ' +
  STYLE_EXAMPLE.slice(2) +
  '\n[그림] ' +
  STYLE_ART.slice(2) +
  '\n[글자] ' +
  STYLE_TYPE.slice(2)

function screenshotGuide(shot: PosterScreenshot): string {
  const frame =
    shot.ratio >= 1
      ? '노트북 틀(CSS로 그린 짙은 회색 화면 테두리 + 아래 받침)'
      : '스마트폰 틀(CSS로 그린 둥근 모서리 48px 이상의 짙은 테두리)'
  return `③ 학생이 올린 실제 화면 캡처가 주인공. <img src="${SHOT_TOKEN}" style="width:…px;height:…px;object-fit:cover;object-position:top"> 하나를 ${frame} 안에 넣는다. 캡처 비율은 가로:세로 = ${shot.ratio}:1 이니 화면 칸도 이 비율에 맞춘다. 틀이 ③ 영역을 크게 채우고, 뒤에 포인트 색의 연한 큰 원이나 둥근 면을 깔아도 좋다. ART 자리와 json 블록은 쓰지 않는다. 캡처 위에 글자를 얹지 않는다.`
}

function styleGuide(style: PosterStyle, shot: PosterScreenshot | null): string {
  if (style === 'screenshot' && shot) return screenshotGuide(shot)
  if (style === 'example') return STYLE_EXAMPLE
  if (style === 'art') return STYLE_ART
  if (style === 'type') return STYLE_TYPE
  return STYLE_AUTO
}

// 그림 AI 할당량이 없을 때 덧붙인다 — 그림도 SVG 로(실험 때 Gemini SVG 도 포스터 수준은 나왔음)
const NO_ART_NOTE =
  '오늘은 그림 AI를 쓸 수 없다. ART 자리와 json 블록을 쓰지 말고, 그림이 들어갈 자리는 같은 크기의 인라인 SVG 그림으로 직접 그린다(밝은 바탕, 2~3가지 색).'

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
  style = 'auto',
  screenshot = null,
}: {
  info: PosterProjectInfo
  currentHtml: string | null
  recent: PosterMessage[]
  request: string
  // 오늘 그림 할당량이 없으면 false — 회색 자리 대신 Gemini 가 SVG 로 직접 그린다
  artAvailable?: boolean
  // 처음 만들 때만 쓴다 — 고칠 땐 지금 HTML 이 스타일을 지닌다
  style?: PosterStyle
  screenshot?: PosterScreenshot | null
}): GeminiContent[] {
  const ask = request.trim()
  const noArt = artAvailable ? '' : `\n\n${NO_ART_NOTE}`
  if (!currentHtml) {
    const guide = styleGuide(style, screenshot)
    return [{ role: 'user', parts: [{ text: `${projectBlock(info)}\n\n스타일: ${guide}\n\n학생의 부탁: ${ask || '없음'}${noArt}` }] }]
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
