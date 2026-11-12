// 대곽나루 서버(Node)에서 서버 fetch 가 사설·루프백·학교망 주소로 못 가게 한다(2026-11-11).
// Workers 는 wrangler.jsonc 의 global_fetch_strictly_public 이 이 일을 했다. Node 에는 그런 설정이 없고, 서버 안에는
// 웹 터미널(ttyd, 127.0.0.1:7681)·노드 nginx(게이트웨이) 같은 내부 주소가 있다 — 파비콘·이미지·도메인 확인이 사용자 URL 을 읽으므로
// 앞단 검사(assertSafePublicUrl)만으로는 리다이렉트·DNS 리바인딩을 못 막는다. 그래서 연결하는 순간(이름 풀기·IP 연결)에 거른다.
// src/instrumentation.ts 가 Node 서버에서만 installSafeDispatcher()를 부른다. Supabase·Cloudinary 등은 공인 주소라 영향 없음.

import dns from 'node:dns'
import net from 'node:net'
import type * as Undici from 'undici'

import { nodeRequire } from './node-require.ts'
import { isBlockedIp } from './ssrf-guard.ts'

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void

function blocked(hostname: string): NodeJS.ErrnoException {
  const err: NodeJS.ErrnoException = new Error(`blocked private address: ${hostname}`)
  err.code = 'EBLOCKEDPRIVATE'
  return err
}

/** dns.lookup 과 같은 모양. 풀린 주소 중 하나라도 사설·예약 IP 면 거절한다. */
export function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, [])
    if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) return callback(blocked(hostname), [])
    if (options.all) return callback(null, addresses)
    callback(null, addresses[0].address, addresses[0].family)
  })
}

/** 전역 fetch 의 연결을 safeLookup 으로. IP 리터럴 주소는 이름 풀기를 안 거치므로 연결 전에 따로 거른다. */
export async function installSafeDispatcher(): Promise<void> {
  const { Agent, buildConnector, setGlobalDispatcher } = await nodeRequire<typeof Undici>('undici')
  const connectSafely = buildConnector({ lookup: safeLookup })
  setGlobalDispatcher(
    new Agent({
      connect(options, callback) {
        const host = options.hostname.replace(/^\[|\]$/g, '')
        if (net.isIP(host) && isBlockedIp(host)) return callback(blocked(host), null)
        return connectSafely(options, callback)
      },
    }),
  )
}

/**
 * 켤 때 자가 시험 — 닫힌 루프백 포트(2 — 9 같은 포트는 fetch 가 스스로 막아 시험이 안 됨)로 fetch 해서 "연결 거부"가 아니라 우리 차단으로 실패하는지 본다.
 * Node·undici 를 올리다 전역 dispatcher 자리가 바뀌면 차단이 조용히 꺼질 수 있어서(2026-11-11 리뷰). false 면 켜지 말 것.
 */
export async function safeDispatcherActive(): Promise<boolean> {
  try {
    await fetch('http://127.0.0.1:2/', { signal: AbortSignal.timeout(3000) })
    return false
  } catch (e) {
    return (e as { cause?: { code?: string } }).cause?.code === 'EBLOCKEDPRIVATE'
  }
}
