// Worker 진입점(wrangler.jsonc "main") — OpenNext 가 만든 .open-next/worker.js 의 fetch 를 그대로 쓰고
// AI 포스터 큐(poster-jobs) 소비자와 매일 밤 파비콘 동기화(scheduled)를 더한다. 방식: https://opennext.js.org/cloudflare/howtos/custom-worker
//
// 탭을 닫으면 Workers 는 waitUntil 을 30초까지만 이어 가서 Gemini(12~90초) 결과가 사라졌다(2026-11-07).
// 소비자는 한 번에 15분까지 살아 있으므로, 같은 Worker 의 내부 경로(/api/poster-jobs/run)를 service binding 으로 불러
// 응답을 끝까지 기다린다 — "클라이언트"가 소비자라 끊기지 않고, 실제 일은 Next 경로가 그대로 한다(요청마다 CPU 10ms 따로).
// 매일 밤 파비콘 동기화(scheduled)도 같은 방식으로 내부 경로 /api/favicon-sync/run 을 부른다.
// 설명: .claude/rules/posters.md 「긴 응답·내보내기」, docs/19-cloudflare-workers.md 「큐」

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore .open-next/worker.js 는 빌드 때 생긴다
import { default as handler } from './.open-next/worker.js'
import { POSTER_JOB_PATH, POSTER_JOB_SIG_HEADER, isJobId, signPosterJob } from './src/lib/posters/ai-jobs-logic'
import { FAVICON_SYNC_PATH, FAVICON_SYNC_PER_NIGHT, FAVICON_SYNC_SIG_HEADER, pickTonight, signFaviconSync } from './src/lib/favicon-sync-job'

// cloudflare-env.d.ts 는 두지 않는다(CLAUDE.md) — 쓰는 것만 적는다
interface Env {
  WORKER_SELF_REFERENCE: { fetch(input: string, init?: RequestInit): Promise<Response> }
  SUPABASE_SERVICE_ROLE_KEY?: string
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

interface QueueMessage {
  body: unknown
  ack(): void
  retry(options?: { delaySeconds?: number }): void
}

const worker = {
  fetch: (handler as { fetch: unknown }).fetch,

  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(syncFavicons(env))
  },

  // max_batch_size 1 — 일감 하나에 소비자 하나(wrangler.jsonc)
  async queue(batch: { messages: readonly QueueMessage[] }, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const jobId = (message.body as { jobId?: unknown } | null)?.jobId
      const secret = env.SUPABASE_SERVICE_ROLE_KEY
      if (!isJobId(jobId) || !secret) {
        console.error('[poster] 큐 메시지 버림', typeof jobId, !!secret)
        message.ack()
        continue
      }
      try {
        const res = await env.WORKER_SELF_REFERENCE.fetch(`https://dshs.dev${POSTER_JOB_PATH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [POSTER_JOB_SIG_HEADER]: await signPosterJob(jobId, secret) },
          body: JSON.stringify({ jobId }),
        })
        await res.body?.cancel()
        // 404 = 서명이 안 맞음(설정 문제) — 다시 해도 같으니 버린다. 5xx 는 다시(이미 잡힌 일감이면 내부 경로가 그냥 200)
        if (res.ok || res.status === 404) message.ack()
        else {
          console.error('[poster] 큐 일감 실패', jobId, res.status)
          message.retry({ delaySeconds: 10 })
        }
      } catch (e) {
        console.error('[poster] 큐 일감 오류', jobId, String(e).slice(0, 200))
        message.retry({ delaySeconds: 10 })
      }
    }
  },
}

export default worker
