// ② "AI에게 보낼 글" — 확인 코드 한 줄과 하는 방법을 묶어 한 번에 복사해 AI 에이전트에게 붙여 넣게 한다.
// 문구는 사용자가 확정한 것(2026-10-25). 첫 두 줄만 2026-10-26 "확인 먼저" 흐름에 맞춰 바꿈(사용자 확인) —
// 아직 주소를 붙이기 전이라 "붙이려고 해"로 쓰고, 확인도 원래 주소(siteUrl)에서 한다. 바꾸면 ai-prompt.test.ts 도 같이 고친다.

import { HOST_PRESETS, isRedirectHost, type HostKey } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'
import { VERIFY_META_NAME } from './verify.ts'

const SECOND_LINE = '먼저 이 사이트가 내 것이라는 걸 확인하는 코드를 넣고 다시 배포해 줘.'

/** siteUrl: ②에서 확인할 학생 사이트 원래 주소(https://…/) */
export function buildVerifyPrompt(o: { name: string; token: string; host: HostKey | null; siteUrl: string }): string {
  const fqdn = `${o.name}.${ROOT_DOMAIN}`
  if (o.host && isRedirectHost(o.host)) return buildRedirectPrompt(fqdn, o.token, o.host, o.siteUrl)
  const hostLabel = o.host ? HOST_PRESETS[o.host].label : '호스트'
  const pushTo = o.host === 'gitlab-pages' ? 'GitLab' : 'GitHub'

  return [
    `내 웹사이트(${o.siteUrl})에 https://${ROOT_DOMAIN} 서비스로 ${fqdn} 주소를 붙이려고 해.`,
    SECOND_LINE,
    '',
    '아래 한 줄을 사이트의 <head> 안에 그대로 넣어 줘.',
    '',
    `<meta name="${VERIFY_META_NAME}" content="${o.token}">`,
    '',
    '조건:',
    '- 사이트를 열었을 때 서버가 처음부터 내려주는 HTML에 들어 있어야 해.',
    '  자바스크립트로 나중에 붙이면 안 돼. (React Helmet, document.head에 추가하는 방식 금지)',
    '- 이 프로젝트 구조에 맞는 자리에 넣어 줘.',
    '  · 일반 HTML, Vite, React: 루트의 index.html <head>',
    `  · Next.js: app/layout 의 metadata → other: { "${VERIFY_META_NAME}": "${o.token}" }`,
    '- 그 밖의 코드는 건드리지 마.',
    `- 다 넣었으면 ${pushTo}에 푸시해서 ${hostLabel}에 다시 배포되게 해 줘.`,
    `- 배포가 끝나면 ${o.siteUrl} 의 "페이지 소스 보기"(또는 curl)에서`,
    '  위 줄이 보이는지 확인하고, 보이는지 알려 줘.',
  ].join('\n')
}

function buildRedirectPrompt(fqdn: string, token: string, host: HostKey, siteUrl: string): string {
  const workers = host === 'cloudflare-workers'
  return [
    `내 웹사이트(${siteUrl})에 https://${ROOT_DOMAIN} 서비스로 ${fqdn} 바로가기 주소를 붙이려고 해.`,
    SECOND_LINE,
    '',
    '아래 한 줄을 사이트의 <head> 안에 그대로 넣어 줘.',
    '',
    `<meta name="${VERIFY_META_NAME}" content="${token}">`,
    '',
    '조건:',
    '- 사이트를 열었을 때 서버가 처음부터 내려주는 HTML에 들어 있어야 해.',
    '  자바스크립트로 나중에 붙이면 안 돼. (React Helmet, document.head에 추가하는 방식 금지)',
    '- 이 프로젝트 구조에 맞는 자리에 넣어 줘.',
    workers
      ? '  · Cloudflare Workers: Worker가 돌려주는 HTML의 <head> (정적 자산을 쓰면 그 폴더의 index.html)'
      : '  · Firebase Hosting: public/index.html',
    '- 그 밖의 코드는 건드리지 마.',
    workers
      ? '- 다 넣었으면 wrangler deploy(또는 연결된 Git에 푸시)로 다시 배포해 줘.'
      : '- 다 넣었으면 firebase deploy 로 다시 배포해 줘.',
    `- 배포가 끝나면 ${siteUrl} 의 "페이지 소스 보기"(또는 curl)에서`,
    '  위 줄이 보이는지 확인하고, 보이는지 알려 줘.',
  ].join('\n')
}
