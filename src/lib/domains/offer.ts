// 도메인 마련하기 권유에 쓰는 순수 로직 — 등록 직후 창, 수정 폼 주소 칸, 상세 페이지 소유자 안내가 같이 쓴다.

import { detectHost, HOST_PRESETS, type HostKey } from './hosts.ts'
import { normalizeName, validateName } from './name.ts'

function urlOf(raw: string): URL | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
}

/**
 * 며칠 뒤 사라지는 미리보기 주소면 원래 주소(호스트 기본 주소)를 돌려준다.
 * Firebase 미리보기 채널(사이트--채널.web.app)·Cloudflare Pages 배포 미리보기(abc123.이름.pages.dev)만 모양으로 알 수 있다 —
 * Vercel·Workers 미리보기는 모양이 기본 주소와 같아서 못 가린다.
 */
export function previewAddressOf(raw: string): { host: string; live: string } | null {
  const u = urlOf(raw)
  if (!u) return null
  const hostname = u.hostname.toLowerCase()
  const firebase = hostname.match(/^([a-z0-9-]+?)--[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/)
  if (firebase) return { host: HOST_PRESETS.firebase.label, live: `${firebase[1]}.${firebase[2]}` }
  const pages = hostname.match(/^[a-z0-9-]+\.([a-z0-9-]+)\.pages\.dev$/)
  if (pages) return { host: HOST_PRESETS['cloudflare-pages'].label, live: `${pages[1]}.pages.dev` }
  return null
}

/**
 * 호스트 무료 주소에서 짧은 이름 예시를 뽑는다(예: toad-dashboard-102826580.web.app → toad-dashboard).
 * 예시일 뿐 빈 이름인지는 보지 않는다. 쓸 만한 이름이 안 나오면 null.
 */
export function suggestNameFrom(raw: string): string | null {
  const u = urlOf(raw)
  if (!u) return null
  const detected = detectHost(u.href)
  if (!detected) return null
  const hostname = u.hostname.toLowerCase()
  // GitHub/GitLab Pages 프로젝트 사이트는 아이디보다 저장소 이름이 사이트 이름에 가깝다
  const pathName = u.pathname.split('/').filter(Boolean)[0]
  let base = (detected.host === 'github-pages' || detected.host === 'gitlab-pages') && pathName ? pathName : hostname.split('.')[0]
  if (detected.host === 'cloudflare-pages') base = hostname.split('.').at(-3) ?? base
  base = normalizeName(base).split('--')[0].split('-git-')[0]
  // 끝에 붙은 숫자·해시 조각(-102826580, -7fc7a)은 뗀다
  const parts = base.split('-').filter(Boolean)
  while (parts.length > 1 && /\d/.test(parts[parts.length - 1])) parts.pop()
  const name = parts.join('-').slice(0, 30).replace(/-+$/, '')
  return validateName(name).ok ? name : null
}

/** 도메인 마련하기를 권할 주소 — 프리셋 9곳의 무료 주소일 때만. 호스트 이름(표시용)과 짧은 이름 예시 */
export function domainOfferOf(raw: string): { host: HostKey; hostLabel: string; hostname: string; suggestion: string | null } | null {
  const u = urlOf(raw)
  if (!u) return null
  const detected = detectHost(u.href)
  if (!detected) return null
  return {
    host: detected.host,
    hostLabel: HOST_PRESETS[detected.host].label,
    hostname: u.hostname.toLowerCase(),
    suggestion: suggestNameFrom(u.href),
  }
}

/** 바로가기 호스트(Firebase·Workers)는 호스트에서 할 일이 없어 금방 끝난다 */
export function quickToConnect(host: HostKey): boolean {
  return HOST_PRESETS[host].mode === 'redirect'
}
