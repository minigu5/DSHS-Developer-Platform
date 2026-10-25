// 3단계 "AI에게 보낼 글" — 확인 코드 한 줄과 하는 방법을 묶어 한 번에 복사해 AI 에이전트에게 붙여 넣게 한다.
// 문구는 사용자가 확정한 것(2026-10-25). 바꾸면 ai-prompt.test.ts 도 같이 고친다.

import { HOST_PRESETS, type HostKey } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'
import { VERIFY_META_NAME } from './verify.ts'

export function buildVerifyPrompt(o: { name: string; token: string; host: HostKey | null }): string {
  const fqdn = `${o.name}.${ROOT_DOMAIN}`
  const hostLabel = o.host ? HOST_PRESETS[o.host].label : '호스트'
  const pushTo = o.host === 'gitlab-pages' ? 'GitLab' : 'GitHub'

  return [
    `내 웹사이트의 도메인을 https://${ROOT_DOMAIN} 서비스를 이용해서 ${fqdn} 로 변경했어.`,
    '이 주소가 내 사이트라는 걸 확인하는 코드를 넣고 다시 배포해 줘.',
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
    `- 배포가 끝나면 https://${fqdn} 의 "페이지 소스 보기"(또는 curl)에서`,
    '  위 줄이 보이는지 확인하고, 보이는지 알려 줘.',
  ].join('\n')
}
