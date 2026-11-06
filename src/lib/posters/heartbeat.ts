// Gemini 응답은 80~90초 걸린다. 그동안 연결이 끊기지 않게 공백을 흘리고, 끝나면 JSON 한 덩어리를 붙인다.
// 브라우저는 본문 전체를 받아 parseHeartbeatBody 로 읽는다.
// 탭을 닫아 연결이 끊겨도 저장까지 끝나야 횟수만 쓰고 결과를 잃는 일이 없다 — Workers 는 끊긴 요청의 남은 일을
// 취소하므로 작업을 waitUntil(ctx.waitUntil)에 맡긴다.

const FAILED = { ok: false, error: '잠시 뒤 다시 시도해 주세요.' }

export function heartbeatJson(
  work: () => Promise<unknown>,
  intervalMs = 15_000,
  waitUntil?: (job: Promise<unknown>) => void,
): Response {
  const encoder = new TextEncoder()
  let open = true
  let timer: ReturnType<typeof setInterval> | undefined
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          open = false
        }
      }
      timer = setInterval(() => send(' '), intervalMs)
      const job = work()
        .catch(() => FAILED)
        .then((result) => {
          clearInterval(timer)
          send(JSON.stringify(result))
          if (open) {
            open = false
            controller.close()
          }
        })
      waitUntil?.(job)
    },
    cancel() {
      open = false
      clearInterval(timer)
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export function parseHeartbeatBody(text: string): unknown {
  return JSON.parse(text.trim())
}
