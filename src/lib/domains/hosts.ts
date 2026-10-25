// 호스트별 연결 절차(프리셋). 호스트를 늘리려면 여기 하나 추가 + DB host CHECK 에 키 추가.
//
// 첫 버전 제외(2026-10-25): Firebase Hosting(CNAME 대신 A 레코드 요구),
// Cloudflare Pages(학생 계정이 우리 계정과 다르면 DNS only CNAME 이 되는지 미확인).
// GitHub Pages 의 `_github-pages-challenge-*` TXT 는 dshs.dev 전체를 그 사용자 것으로 확인하므로 받지 않는다.

import { ROOT_DOMAIN } from './name.ts'

export type HostKey = 'vercel' | 'netlify' | 'github-pages' | 'render'

export type HostPreset = {
  key: HostKey
  label: string
  /** 프로젝트 url 의 호스트로 미리 고르기 */
  detect: RegExp
  /** 학생이 붙여 넣는 CNAME 값 — 호스트 소유 도메인만 */
  cnameTarget: RegExp
  /** 프로젝트 url 호스트가 곧 CNAME 값인 호스트 */
  prefillFromUrl: boolean
  /** Vercel 의 `_vercel.dshs.dev` 확인 TXT 허용 */
  allowsVercelTxt: boolean
  settingsUrl: string
  /** 2단계 안내(해요체). `{fqdn}` 은 화면에서 실제 주소로 바뀐다 */
  steps: string[]
  /** 점검: 호스트의 "이 주소의 사이트 없음" 응답인가 */
  notFound: (status: number, headers: Headers, body: string) => boolean
}

export const HOST_PRESETS: Record<HostKey, HostPreset> = {
  vercel: {
    key: 'vercel',
    label: 'Vercel',
    detect: /\.vercel\.app$/,
    cnameTarget: /^(cname\.vercel-dns\.com|cname\.vercel-dns-\d{1,4}\.com|[a-z0-9]{8,32}\.vercel-dns-\d{1,4}\.com)$/,
    prefillFromUrl: false,
    allowsVercelTxt: true,
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
    label: 'Netlify',
    detect: /\.netlify\.app$/,
    cnameTarget: /^[a-z0-9-]+\.netlify\.app$/,
    prefillFromUrl: true,
    allowsVercelTxt: false,
    settingsUrl: 'https://app.netlify.com',
    steps: [
      'Netlify에서 사이트를 열고 Domain management → Add a domain을 눌러 이 주소를 넣어요: {fqdn}',
      '아래 CNAME 값에 내 사이트 주소(이름.netlify.app)가 맞는지 확인해요.',
    ],
    notFound: (status, _headers, body) => status === 404 && body.includes('Not Found - Request ID'),
  },
  'github-pages': {
    key: 'github-pages',
    label: 'GitHub Pages',
    detect: /\.github\.io$/,
    cnameTarget: /^[a-z0-9-]+\.github\.io$/,
    prefillFromUrl: true,
    allowsVercelTxt: false,
    settingsUrl:
      'https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain',
    steps: [
      '저장소 Settings → Pages → Custom domain 칸에 이 주소를 넣고 저장해요: {fqdn}',
      '아래 CNAME 값은 저장소 이름 없이 내아이디.github.io 여야 해요.',
      '인증서가 나오면 같은 화면에서 Enforce HTTPS를 켜요.',
    ],
    notFound: (status, _headers, body) => status === 404 && body.includes("There isn't a GitHub Pages site here"),
  },
  render: {
    key: 'render',
    label: 'Render',
    detect: /\.onrender\.com$/,
    cnameTarget: /^[a-z0-9-]+\.onrender\.com$/,
    prefillFromUrl: true,
    allowsVercelTxt: false,
    settingsUrl: 'https://dashboard.render.com',
    steps: [
      'Render에서 서비스를 열고 Settings → Custom Domains → Add Custom Domain을 눌러 이 주소를 넣어요: {fqdn}',
      '아래 CNAME 값에 내 서비스 주소(이름.onrender.com)가 맞는지 확인해요.',
    ],
    notFound: (status, headers) => status === 404 && (headers.get('x-render-routing') ?? '').includes('no-server'),
  },
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
    if (p.detect.test(hostname)) return { host: p.key, prefill: p.prefillFromUrl ? hostname : null }
  }
  return null
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
    return HOST_PRESETS[host].allowsVercelTxt && value.startsWith(`vc-domain-verify=${fqdn},`) ? { name, value } : null
  }
  // 내 이름 바로 그 자리(CNAME 과 같은 이름)는 안 되고, 그 아래만
  const sub = name.slice(0, -(fqdn.length + 1))
  if (!name.endsWith(`.${fqdn}`) || !/^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*$/.test(sub)) return null
  return { name, value }
}
