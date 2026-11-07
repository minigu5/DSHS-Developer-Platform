// Worker 진입점(wrangler.jsonc "main") — OpenNext 가 만든 .open-next/worker.js 의 fetch 를 그대로 쓰고
// AI 포스터 큐(poster-jobs) 소비자를 더한다. 방식: https://opennext.js.org/cloudflare/howtos/custom-worker
//
// 탭을 닫으면 Workers 는 waitUntil 을 30초까지만 이어 가서 Gemini(12~90초) 결과가 사라졌다(2026-11-07).
// 소비자는 한 번에 15분까지 살아 있으므로, 같은 Worker 의 내부 경로(/api/poster-jobs/run)를 service binding 으로 불러
// 응답을 끝까지 기다린다 — "클라이언트"가 소비자라 끊기지 않고, 실제 일은 Next 경로가 그대로 한다(요청마다 CPU 10ms 따로).
// 설명: .claude/rules/posters.md 「긴 응답·내보내기」, docs/19-cloudflare-workers.md 「큐」

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore .open-next/worker.js 는 빌드 때 생긴다
import { default as handler } from './.open-next/worker.js'
import { POSTER_JOB_PATH, POSTER_JOB_SIG_HEADER, isJobId, signPosterJob } from './src/lib/posters/ai-jobs-logic'

// cloudflare-env.d.ts 는 두지 않는다(CLAUDE.md) — 쓰는 것만 적는다
interface Env {
  WORKER_SELF_REFERENCE: { fetch(input: string, init?: RequestInit): Promise<Response> }
  SUPABASE_SERVICE_ROLE_KEY?: string
}

interface QueueMessage {
  body: unknown
  ack(): void
  retry(options?: { delaySeconds?: number }): void
}

const worker = {
  fetch: (handler as { fetch: unknown }).fetch,

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
