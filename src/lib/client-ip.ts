// 요청한 사람의 IP(클릭 집계 해시용, 2026-11-12).
// dshs.dev 가 대곽나루 서버로 갈 때는 서울 입구(relay/lib/forward.js) → 대곽나루 입구 → 노드 nginx 를 거쳐 cf-connecting-ip 가
// 입구의 출구 IP 가 된다. 그래서 입구가 실제 IP 를 x-dshs-client-ip 로, 비밀 키를 x-dshs-relay-key 로 넘기고 키가 맞을 때만 믿는다.
// Worker 에는 키(DSHS_RELAY_KEY)가 없어 입구 헤더를 늘 무시한다.
import net from 'node:net'

export const RELAY_IP_HEADER = 'x-dshs-client-ip'
export const RELAY_KEY_HEADER = 'x-dshs-relay-key'

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function clientIpOf(headers: Headers, relayKey: string | undefined): string {
  const relayed = headers.get(RELAY_IP_HEADER)?.trim()
  const key = headers.get(RELAY_KEY_HEADER) ?? ''
  if (relayKey && relayed && net.isIP(relayed) && sameSecret(key, relayKey)) return relayed
  // Cloudflare 가 넣는 cf-connecting-ip 를 먼저 — x-forwarded-for 첫 값은 요청자가 꾸밀 수 있음
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
