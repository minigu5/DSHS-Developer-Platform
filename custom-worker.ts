// Worker 진입점(wrangler.jsonc "main") — OpenNext 가 만든 .open-next/worker.js 의 fetch 를 그대로 쓰고
// 매일 밤 파비콘 동기화(scheduled)를 더한다. 방식: https://opennext.js.org/cloudflare/howtos/custom-worker
//
// 매일 밤 파비콘 동기화(scheduled)도 같은 방식으로 내부 경로 /api/favicon-sync/run 을 부른다.
// IP당 속도 제한(RATE_LIMITER)도 여기서 — 아래 limitedResponse 참고.
// 설명: docs/19-cloudflare-workers.md

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore .open-next/worker.js 는 빌드 때 생긴다
import { default as handler } from './.open-next/worker.js'
import { FAVICON_SYNC_PATH, FAVICON_SYNC_PER_NIGHT, FAVICON_SYNC_SIG_HEADER, pickTonight, signFaviconSync } from './src/lib/favicon-sync-job'

// cloudflare-env.d.ts 는 두지 않는다(CLAUDE.md) — 쓰는 것만 적는다
interface Env {
  WORKER_SELF_REFERENCE: { fetch(input: string, init?: RequestInit): Promise<Response> }
  SUPABASE_SERVICE_ROLE_KEY?: string
  RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

// 파비콘 동기화 내부 경로 부르기(서명 = 대상의 HMAC). 프로젝트 하나에 최대 30초쯤이라 몇 개씩 동시에
const FAVICON_CONCURRENCY = 4

async function callFaviconSync(env: Env, secret: string, projectId?: string): Promise<Record<string, unknown>> {
  const res = await env.WORKER_SELF_REFERENCE.fetch(`https://dshs.dev${FAVICON_SYNC_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [FAVICON_SYNC_SIG_HEADER]: await signFaviconSync(projectId ?? 'list', secret),
    },
    body: JSON.stringify(projectId ? { projectId } : {}),
  })
  return ((await res.json().catch(() => null)) as Record<string, unknown> | null) ?? { ok: false, status: res.status }
}

// 매일 밤 "URL에서 자동 추출" 아이콘을 사이트의 지금 파비콘으로 맞춘다(wrangler.jsonc triggers.crons).
// 예전엔 GitHub Actions가 돌렸는데 러너 IP를 Cloudflare가 막아 *.dshs.dev 같은 사이트를 못 읽었다(2026-11-07).
async function syncFavicons(env: Env): Promise<void> {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return console.error('[favicon] 서비스 키 없음')
  const list = await callFaviconSync(env, secret)
  const ids = Array.isArray(list.ids) ? (list.ids as string[]) : null
  if (!ids) return console.error('[favicon] 목록 실패', JSON.stringify(list).slice(0, 200))

  const tonight = pickTonight(ids, FAVICON_SYNC_PER_NIGHT, Math.floor(Date.now() / 86_400_000))
  const count: Record<string, number> = {}
  let next = 0
  await Promise.all(
    Array.from({ length: FAVICON_CONCURRENCY }, async () => {
      while (next < tonight.length) {
        const id = tonight[next++]
        const result: Record<string, unknown> = await callFaviconSync(env, secret, id).catch((e) => ({ ok: false, error: String(e) }))
        const kind = result.ok ? String(result.kind) : 'failed'
        count[kind] = (count[kind] ?? 0) + 1
        if (!result.ok) console.error('[favicon] 실패', id.slice(0, 8), JSON.stringify(result).slice(0, 200))
      }
    }),
  )
  console.log('[favicon] 끝', `대상 ${tonight.length}/${ids.length}`, JSON.stringify(count))
}

// IP당 속도 제한(2026-11-20 감사). dshs.dev 는 회색 구름으로 서울 입구(Pages)를 거쳐 service binding 으로 오므로
// 대시보드의 존 규칙 `rate limit protection`(IP당 200회/10초)이 안 걸린다(실측: /logo.svg 300회 전부 200 — 11-04엔 203회 뒤 429).
// 그래서 같은 기준(200회/10초, /_next/static 제외 — wrangler.jsonc ratelimits)을 Worker 에서 센다. 학교는 IP 하나라 더 낮추지 말 것.
// 키는 cf-connecting-ip — Cloudflare 가 입구에서 덮어쓰는 값이라 꾸밀 수 없다(x-forwarded-for 는 꾸밀 수 있어 안 씀).
// 그 헤더가 없는 내부 호출(파비콘 동기화)·바인딩이 없는 로컬은 세지 않는다. 막아도 입구 함수 실행은 하루 한도에 들어간다(한도 자체는 Workers Paid).
async function limitedResponse(request: Request, env: Env): Promise<Response | null> {
  const ip = request.headers.get('cf-connecting-ip')
  if (!ip || !env.RATE_LIMITER) return null
  if (new URL(request.url).pathname.startsWith('/_next/static/')) return null
  try {
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    if (success) return null
  } catch {
    return null
  }
  return new Response('요청이 너무 많아요. 10초쯤 뒤에 다시 시도해 주세요.', {
    status: 429,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '10', 'cache-control': 'no-store' },
  })
}

type FetchHandler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>
const openNextFetch = (handler as { fetch: FetchHandler }).fetch

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return (await limitedResponse(request, env)) ?? openNextFetch(request, env, ctx)
  },

  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(syncFavicons(env))
  },

}

export default worker
