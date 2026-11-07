// 매일 밤 파비콘 동기화를 Worker 예약 작업(custom-worker.ts scheduled)이 부르는 내부 경로의 약속.
// GitHub Actions 러너는 Cloudflare가 막아(*.dshs.dev 등) 사이트를 못 읽어서 2026-11-07 Worker로 옮겼다.
// custom-worker.ts(Next 밖)도 쓰므로 '@/' 경로·server-only 를 import 하지 않는다.

import { signInternal, verifyInternal } from './internal-sig.ts'

export const FAVICON_SYNC_PATH = '/api/favicon-sync/run'
export const FAVICON_SYNC_SIG_HEADER = 'x-favicon-sync-sig'

// 무료 요금제는 호출 한 번에 바깥 요청 50개까지(service binding 포함) — 목록 1개 + 프로젝트마다 1개라 하룻밤 45개까지만
export const FAVICON_SYNC_PER_NIGHT = 45

/** 서명할 내용: 목록 요청은 'list', 프로젝트 하나는 그 id */
const messageOf = (target: string) => `favicon-sync:${target}`

export function signFaviconSync(target: string, secret: string): Promise<string> {
  return signInternal(messageOf(target), secret)
}

export function verifyFaviconSync(target: string, sig: string | null, secret: string | undefined): Promise<boolean> {
  return verifyInternal(messageOf(target), sig, secret)
}

/** 대상이 하룻밤 몫보다 많으면 날마다 시작점을 옮겨 며칠에 걸쳐 모두 돈다 */
export function pickTonight<T>(items: readonly T[], perNight: number, dayIndex: number): T[] {
  if (items.length <= perNight) return [...items]
  const start = (dayIndex * perNight) % items.length
  return Array.from({ length: perNight }, (_, i) => items[(start + i) % items.length])
}
