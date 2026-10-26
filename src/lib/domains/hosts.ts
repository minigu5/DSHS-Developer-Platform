// 호스트별 연결 절차(프리셋). 호스트를 늘리려면 여기 하나 추가 + DB host CHECK·subdomain_target_ok() 에 키 추가(새 migration).
//
// Cloudflare Pages: 다른 계정의 Pages 프로젝트에 DNS only CNAME 으로 붙는 것 확인(2026-10-25, 인증서 약 2분 30초).
// 바로가기(mode 'redirect', 2026-10-26): Cloudflare Workers(커스텀 도메인은 존이 같은 계정에 있어야 함)·
// Firebase Hosting(CNAME 대신 A 레코드 요구)은 연결 대신 <이름>.dshs.dev → 학생 사이트 302 로 보낸다.
// 설계 docs/superpowers/specs/2026-10-26-subdomain-redirects-design.md
// 제외: Surge(모두 같은 CNAME 대상이라 가로채기 쉬움).
// GitHub Pages 의 `_github-pages-challenge-*` TXT 는 dshs.dev 전체를 그 사용자 것으로 확인하므로 받지 않는다.

import { ROOT_DOMAIN } from './name.ts'

export type HostKey =
  | 'vercel'
  | 'netlify'
  | 'cloudflare-pages'
  | 'github-pages'
  | 'gitlab-pages'
  | 'render'
  | 'railway'
  | 'cloudflare-workers'
  | 'firebase'

export type HostPreset = {
  key: HostKey
  label: string
  /** cname: 학생 호스트에 CNAME 으로 연결 / redirect: 우리가 학생 사이트로 302 바로가기(target 이 곧 학생 사이트) */
  mode: 'cname' | 'redirect'
  /** 프로젝트 url 의 호스트로 미리 고르기 */
  detect: RegExp
  /** 학생이 붙여 넣는 CNAME 값(바로가기는 보낼 곳 주소) — 호스트 소유 도메인만 */
  cnameTarget: RegExp
  /** 프로젝트 url 호스트가 곧 CNAME 값인 호스트 */
  prefillFromUrl: boolean
  /** CNAME 칸 예시 */
  targetPlaceholder: string
  /** 호스트가 요구하는 확인용 TXT 칸. name 의 `{label}` 은 내 이름으로 바뀐다 */
  txt: { name: string; valuePlaceholder: string; required: boolean } | null
  settingsUrl: string
  /** 2단계 안내(해요체). `{fqdn}` 은 화면에서 실제 주소로 바뀐다 */
  steps: string[]
  /** 점검: 호스트의 "이 주소의 사이트 없음" 응답인가 */
  notFound: (status: number, headers: Headers, body: string) => boolean
}

export const HOST_PRESETS: Record<HostKey, HostPreset> = {
  vercel: {
    key: 'vercel',
    mode: 'cname',
    label: 'Vercel',
    detect: /\.vercel\.app$/,
    cnameTarget: /^(cname\.vercel-dns\.com|cname\.vercel-dns-\d{1,4}\.com|[a-z0-9]{8,32}\.vercel-dns-\d{1,4}\.com)$/,
    prefillFromUrl: false,
    targetPlaceholder: 'abc123.vercel-dns-017.com',
    txt: { name: '_vercel', valuePlaceholder: 'vc-domain-verify={fqdn},…', required: false },
    settingsUrl: 'https://vercel.com/dashboard',
    steps: [
      'Vercel에서 이 프로젝트를 열고 Settings → Domains → Add Domain을 눌러 이 주소를 넣어요: {fqdn}',
      'Vercel이 보여 주는 CNAME 값(예: abc123.vercel-dns-017.com)을 복사해 아래에 붙여 넣어요.',
      'TXT 확인값(_vercel)을 달라고 하면 그것도 아래 "TXT 확인값"에 붙여 넣어요.',
    ],
    notFound: (status, headers) => status === 404 && headers.has('x-vercel-error'),
  },
  netlify: {
    key: 'netlify',
    mode: 'cname',
    label: 'Netlify',
    detect: /\.netlify\.app$/,
    cnameTarget: /^[a-z0-9-]+\.netlify\.app$/,
    prefillFromUrl: true,
    targetPlaceholder: '이름.netlify.app',
    txt: null,
    settingsUrl: 'https://app.netlify.com',
    steps: [
      'Netlify에서 사이트를 열고 Domain management → Add a domain을 눌러 이 주소를 넣어요: {fqdn}',
      '아래 CNAME 값에 내 사이트 주소(이름.netlify.app)가 맞는지 확인해요.',
    ],
    // 요청의 Accept 에 따라 텍스트("Not Found - Request ID") 또는 HTML("Site not found") 페이지가 온다
    notFound: (status, _headers, body) =>
      status === 404 && (body.includes('Not Found - Request ID') || body.includes('<title>Site not found</title>')),
  },
  'cloudflare-pages': {
    key: 'cloudflare-pages',
    mode: 'cname',
    label: 'Cloudflare Pages',
    detect: /\.pages\.dev$/,
    // 프로젝트 주소(이름.pages.dev)만 — 배포마다 생기는 미리보기 주소(abc123.이름.pages.dev)는 안 됨
    cnameTarget: /^[a-z0-9-]+\.pages\.dev$/,
    prefillFromUrl: true,
    targetPlaceholder: '이름.pages.dev',
    txt: null,
    settingsUrl: 'https://dash.cloudflare.com/?to=/:account/workers-and-pages',
    steps: [
      'Cloudflare에서 Workers & Pages → 내 Pages 프로젝트 → Custom domains → Set up a custom domain을 눌러 이 주소를 넣어요: {fqdn}',
      'DNS 레코드를 직접 추가하라고 나오면 그건 우리가 해요. 아래 CNAME 값에 내 프로젝트 주소(이름.pages.dev)가 맞는지만 확인해요.',
      '몇 분 뒤 Cloudflare 화면에서 Active가 되면 다음 단계로 가요. Workers로 올렸다면 위에서 Cloudflare Workers를 골라요.',
    ],
    // 모르는 주소는 Cloudflare 오류(530)·인증서 없음이라 호스트 "사이트 없음" 페이지로 가릴 수 없다 → "연결 안 됨"으로 보인다
    notFound: () => false,
  },
  'github-pages': {
    key: 'github-pages',
    mode: 'cname',
    label: 'GitHub Pages',
    detect: /\.github\.io$/,
    cnameTarget: /^[a-z0-9-]+\.github\.io$/,
    prefillFromUrl: true,
    targetPlaceholder: '내아이디.github.io',
    txt: null,
    settingsUrl:
      'https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain',
    steps: [
      '저장소 Settings → Pages → Custom domain 칸에 이 주소를 넣고 저장해요: {fqdn}',
      '아래 CNAME 값은 저장소 이름 없이 내아이디.github.io 여야 해요.',
      '인증서가 나오면 같은 화면에서 Enforce HTTPS를 켜요.',
    ],
    notFound: (status, _headers, body) => status === 404 && body.includes("There isn't a GitHub Pages site here"),
  },
  'gitlab-pages': {
    key: 'gitlab-pages',
    mode: 'cname',
    label: 'GitLab Pages',
    detect: /\.gitlab\.io$/,
    cnameTarget: /^[a-z0-9-]+\.gitlab\.io$/,
    prefillFromUrl: true,
    targetPlaceholder: '내아이디.gitlab.io',
    txt: { name: '_gitlab-pages-verification-code.{label}', valuePlaceholder: 'gitlab-pages-verification-code=…', required: true },
    settingsUrl: 'https://docs.gitlab.com/user/project/pages/custom_domains_ssl_tls_certification/',
    steps: [
      '프로젝트에서 Deploy → Pages → New Domain을 눌러 이 주소를 넣어요: {fqdn}',
      '아래 CNAME 값은 프로젝트 이름 없이 내아이디.gitlab.io 여야 해요.',
      'GitLab이 보여 주는 확인 코드(gitlab-pages-verification-code=…)를 아래 "TXT 확인값"에 붙여 넣어요.',
      'Settings → General → Visibility에서 Pages를 Everyone으로 열어 두어야 확인돼요.',
    ],
    // 모르는 주소는 projects.gitlab.io 로그인으로 넘겨서(302) 여기까지 오지 않는다 → "연결 안 됨"으로 보인다
    notFound: () => false,
  },
  render: {
    key: 'render',
    mode: 'cname',
    label: 'Render',
    detect: /\.onrender\.com$/,
    cnameTarget: /^[a-z0-9-]+\.onrender\.com$/,
    prefillFromUrl: true,
    targetPlaceholder: '이름.onrender.com',
    txt: null,
    settingsUrl: 'https://dashboard.render.com',
    steps: [
      'Render에서 서비스를 열고 Settings → Custom Domains → Add Custom Domain을 눌러 이 주소를 넣어요: {fqdn}',
      '아래 CNAME 값에 내 서비스 주소(이름.onrender.com)가 맞는지 확인해요.',
    ],
    notFound: (status, headers) => status === 404 && (headers.get('x-render-routing') ?? '').includes('no-server'),
  },
  railway: {
    key: 'railway',
    mode: 'cname',
    label: 'Railway',
    detect: /\.up\.railway\.app$/,
    // 서비스 주소가 아니라 도메인마다 따로 주는 값(예: g05ns7.up.railway.app)
    cnameTarget: /^[a-z0-9-]+\.up\.railway\.app$/,
    prefillFromUrl: false,
    targetPlaceholder: 'abc123.up.railway.app',
    txt: { name: '_railway-verify.{label}', valuePlaceholder: 'railway-verify=…', required: true },
    settingsUrl: 'https://railway.com/dashboard',
    steps: [
      'Railway에서 서비스를 열고 Settings → Networking → Custom Domain을 눌러 이 주소를 넣어요: {fqdn}',
      'Railway가 보여 주는 CNAME 값(예: abc123.up.railway.app)을 복사해 아래에 붙여 넣어요. 서비스 주소와 달라요.',
      'TXT 확인값(_railway-verify)도 아래 "TXT 확인값"에 붙여 넣어요. 없으면 연결이 안 돼요.',
    ],
    notFound: (status, headers) => status === 404 && headers.get('x-railway-fallback') === 'true',
  },
  'cloudflare-workers': {
    key: 'cloudflare-workers',
    mode: 'redirect',
    label: 'Cloudflare Workers',
    detect: /\.workers\.dev$/,
    // 워커이름.계정서브도메인.workers.dev — 버전 미리보기 주소는 모양으로 못 가려서 안내만 한다
    cnameTarget: /^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/,
    prefillFromUrl: true,
    targetPlaceholder: '워커이름.아이디.workers.dev',
    txt: null,
    settingsUrl: 'https://dash.cloudflare.com/?to=/:account/workers-and-pages',
    steps: [
      '호스트 쪽에서 따로 할 일은 없어요. 아래 "보낼 곳 주소"가 내 Worker 기본 주소(워커이름.아이디.workers.dev)인지 확인해요.',
      '버전마다 생기는 미리보기 주소(앞에 글자가 더 붙은 주소)는 곧 사라지니 넣지 말아요.',
      '{fqdn}으로 들어오면 이 주소로 넘어가요. 주소창에는 workers.dev 주소가 보여요.',
    ],
    notFound: () => false,
  },
  firebase: {
    key: 'firebase',
    mode: 'redirect',
    label: 'Firebase Hosting',
    detect: /\.(web\.app|firebaseapp\.com)$/,
    // 미리보기 채널(사이트--채널.web.app)은 기한이 지나면 사라진다 → `--` 가 든 이름은 안 받는다
    cnameTarget: /^(?!.*--)[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/,
    prefillFromUrl: true,
    targetPlaceholder: '이름.web.app',
    txt: null,
    settingsUrl: 'https://console.firebase.google.com/',
    steps: [
      '호스트 쪽에서 따로 할 일은 없어요. 아래 "보낼 곳 주소"가 내 사이트 주소(이름.web.app)인지 확인해요.',
      '미리보기 채널 주소(이름--채널.web.app)는 넣을 수 없어요.',
      '{fqdn}으로 들어오면 이 주소로 넘어가요. 주소창에는 web.app 주소가 보여요.',
    ],
    notFound: () => false,
  },
}

export function isRedirectHost(host: HostKey | null): boolean {
  return host !== null && HOST_PRESETS[host].mode === 'redirect'
}

/** 소유 확인 토큰을 찾아볼 사이트 — 바로가기는 보낼 곳(target), 연결은 우리 주소 */
export function siteHostFor(row: { name: string; host: HostKey; target: string | null }): string {
  return isRedirectHost(row.host) && row.target ? row.target : `${row.name}.${ROOT_DOMAIN}`
}

function hostnameOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function detectHost(projectUrl: string): { host: HostKey; prefill: string | null } | null {
  const hostname = hostnameOf(projectUrl)
  if (!hostname) return null
  for (const p of Object.values(HOST_PRESETS)) {
    if (p.detect.test(hostname)) return { host: p.key, prefill: p.prefillFromUrl && p.cnameTarget.test(hostname) ? hostname : null }
  }
  return null
}

// 프리셋에는 없지만 호스트가 기본으로 나눠 주는 주소들 — 내 도메인으로 보지 않는다
const OTHER_DEFAULT_HOST_SUFFIXES = [
  'workers.dev', 'web.app', 'firebaseapp.com', 'surge.sh', 'herokuapp.com', 'fly.dev', 'run.app',
  'glitch.me', 'repl.co', 'replit.app', 'streamlit.app', 'hf.space', 'deno.dev',
]

/**
 * 프로젝트 방문 주소가 호스트 기본 주소(.vercel.app 등)가 아니라 내가 가진 도메인(예: dshs.dev)이면 그 호스트 이름.
 * 호스트 기본 주소·localhost·IP·우리가 빌려준 `*.dshs.dev`는 null. 모르는 무료 호스트는 내 도메인으로 잘못 볼 수 있다.
 */
export function customDomainOf(projectUrl: string): string | null {
  const hostname = hostnameOf(projectUrl)
  if (!hostname || !hostname.includes('.')) return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || /(^|\.)(localhost|local)$/.test(hostname)) return null
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) return null
  if (detectHost(projectUrl)) return null
  if (OTHER_DEFAULT_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) return null
  return hostname
}

export function validateTarget(host: HostKey, target: string): string | null {
  const v = target.trim().toLowerCase().replace(/\.$/, '')
  return HOST_PRESETS[host].cnameTarget.test(v) ? v : null
}

export type TxtInput = { name: string; value: string }

export function validateTxt(host: HostKey, label: string, txt: TxtInput): TxtInput | null {
  const value = txt.value.trim()
  if (value.length < 1 || value.length > 255) return null

  let name = txt.name.trim().toLowerCase().replace(/\.$/, '')
  if (!name.endsWith(`.${ROOT_DOMAIN}`)) name = `${name}.${ROOT_DOMAIN}`

  const fqdn = `${label}.${ROOT_DOMAIN}`
  if (name === `_vercel.${ROOT_DOMAIN}`) {
    return host === 'vercel' && value.startsWith(`vc-domain-verify=${fqdn},`) ? { name, value } : null
  }
  // 내 이름 바로 그 자리(CNAME 과 같은 이름)는 안 되고, 그 아래만
  const sub = name.slice(0, -(fqdn.length + 1))
  if (!name.endsWith(`.${fqdn}`) || !/^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*$/.test(sub)) return null
  return { name, value }
}
