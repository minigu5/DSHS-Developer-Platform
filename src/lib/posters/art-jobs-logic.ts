// 학교 Mac mini 그림 일감의 판단만 모은 순수 함수 — 네트워크·DB 없이 node:test 로 검증한다.
// 설계: docs/superpowers/specs/2026-11-06-poster-mac-art-design.md

import { POSTER_MAC } from './config.ts'

export type ArtJobStatus = 'queued' | 'working' | 'done' | 'failed' | 'canceled' | 'expired'

/** Mac 토큰·job secret 의 SHA-256 소문자 hex — DB 의 encode(sha256(...), 'hex') 와 같은 값(Node·Workers 공통) */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function parseBearer(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(\S+)$/)
  return m ? m[1] : null
}

const startsWith = (head: Uint8Array, bytes: number[], at = 0) => bytes.every((b, i) => head[at + i] === b)

/** 첫 바이트로 실제 이미지 형식 확인 — Content-Type 만 믿지 않는다 */
export function sniffImageType(head: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

interface ResultJob {
  status: ArtJobStatus
  worker_id: string | null
  job_secret_hash: string | null
  lease_until: string | null
}

/**
 * Mac 이 올린 결과를 받을지. workerId 는 토큰으로 찾은 끊기지 않은 Mac(없으면 null).
 * 이미 done 인 같은 일감·같은 Mac 이면 'already'(502 뒤 재시도에도 200, 멱등).
 */
export function judgeResult(i: { job: ResultJob | null; workerId: string | null; secretHash: string; now: Date }): 'accept' | 'already' | 'reject' {
  const { job, workerId } = i
  if (!job || !workerId || job.worker_id !== workerId || job.job_secret_hash !== i.secretHash) return 'reject'
  if (job.status === 'done') return 'already'
  if (job.status !== 'working' || !job.lease_until) return 'reject'
  return i.now.getTime() - new Date(job.lease_until).getTime() > POSTER_MAC.leaseGraceMs ? 'reject' : 'accept'
}

interface StuckJob {
  status: ArtJobStatus
  created_at: string
  lease_until: string | null
  claimed_at: string | null
}

/**
 * 기다리는 그림이 막혔는지(→ 정리하고 클라우드로). release = art_local 횟수를 돌려줄지.
 * failed 는 /fail 에서 이미 돌려줬다. claim RPC 가 expired 로 바꾼 것은 아직 안 돌려줬다.
 */
export function judgeStuck(i: { job: StuckJob; macsAlive: boolean; now: Date }): { stuck: false } | { stuck: true; release: boolean } {
  const { job, now } = i
  if (job.status === 'failed') return { stuck: true, release: false }
  if (job.status === 'expired') return { stuck: true, release: true }
  if (job.status === 'queued') {
    const waited = now.getTime() - new Date(job.created_at).getTime()
    if (waited > POSTER_MAC.queueMaxMs || (!i.macsAlive && waited > POSTER_MAC.unclaimedMs)) return { stuck: true, release: true }
    return { stuck: false }
  }
  if (job.status === 'working' && job.lease_until && now.getTime() - new Date(job.lease_until).getTime() > POSTER_MAC.leaseGraceMs) {
    return { stuck: true, release: true }
  }
  return { stuck: false }
}

/** 늦게 온 결과는 포스터가 아직 그 일감을 기다릴 때만 붙인다(되돌리기·새 주문 뒤엔 무시) */
export function shouldApplyResult(posterArtJobId: string | null, jobId: string): boolean {
  return posterArtJobId === jobId
}
