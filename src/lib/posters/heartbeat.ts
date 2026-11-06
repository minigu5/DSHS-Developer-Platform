// Gemini 응답은 80~90초 걸린다. 그동안 연결이 끊기지 않게 공백을 흘리고, 끝나면 JSON 한 덩어리를 붙인다.
// 브라우저는 본문 전체를 받아 parseHeartbeatBody 로 읽는다.

const FAILED = { ok: false, error: '잠시 뒤 다시 시도해 주세요.' }

export function heartbeatJson(work: () => Promise<unknown>, intervalMs = 15_000): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const timer = setInterval(() => controller.enqueue(encoder.encode(' ')), intervalMs)
      let result: unknown
      try {
        result = await work()
      } catch {
        result = FAILED
      }
      clearInterval(timer)
      controller.enqueue(encoder.encode(JSON.stringify(result)))
      controller.close()
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export function parseHeartbeatBody(text: string): unknown {
  return JSON.parse(text.trim())
}
