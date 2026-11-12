// 서울 입구에서 대곽나루 서버로 넘기고, 서버가 안 되면 Worker(예비)로 (2026-11-12, docs/25-naru-server.md 「2단계」)
//
// dshs.dev → (이 Pages Function) → https://<ORIGIN_HOST>(대곽나루 학생 주소 → 대곽나루 서울 입구 → 노드 nginx → 서버 8080)
//
// 언제 Worker(env.APP, service binding)로 다시 보내나 — 같은 요청이 서버·Worker 에서 두 번 처리되지 않게(2026-11-12 보안 점검):
//  - 서버까지 안 간 게 확실할 때는 무엇이든: 연결 실패(예외), Cloudflare 521/522/523/530, nginx "헤더가 너무 크다" 400.
//  - 서버가 처리했을 수도 있을 때(nginx 502/503/504·524, 시간 초과)는 "페이지 GET"(/api·/auth 밖의 GET/HEAD)만.
//    /api/posters/<id>/export(렌더 수십 초·횟수 차감)·/auth/callback(code 는 한 번만 교환)이 두 번 돌던 문제.
//  - 앱이 낸 JSON 오류(application/json)는 서버 장애가 아니다 — 그대로 돌려준다.
//  - 서버가 안 되면 30초 동안은 서버를 건너뛴다(isolate 마다) — 멈춘 서버에 요청마다 10초씩 기다리지 않게.
//
// 중계를 두 번 거치면 서버에 보이는 cf-connecting-ip 는 이 함수의 출구 IP 라, 실제 사용자 IP 를 x-dshs-client-ip 로 넘기고
// 비밀 키(x-dshs-relay-key = env.ORIGIN_KEY, 서버 env DSHS_RELAY_KEY 와 같은 값)를 붙인다. 앱은 키가 맞을 때만 믿는다(src/lib/client-ip.ts).
// 브라우저가 보낸 같은 이름의 헤더는 지운다. x-forwarded-host 는 공개 호스트(env.PUBLIC_HOST)로 고정 — pages.dev 로 들어와도
// 서버 액션 출처 검사가 dshs.dev 기준이 되게.

const IP_HEADER = 'x-dshs-client-ip'
const KEY_HEADER = 'x-dshs-relay-key'
const UNREACHED = new Set([521, 522, 523, 530]) // Cloudflare 가 서버에 못 닿음
const MAYBE_PROCESSED = new Set([502, 503, 504, 524])
const MAX_BUFFER = 12 * 1024 * 1024 // 이보다 큰 본문은 서버로만(실패해도 Worker 로 다시 못 보냄)
// 대곽나루 노드 nginx 가 받는 요청 헤더 한 줄 한도 — 처음엔 8KB 라 쿠키가 큰 사람이 400 "Request Header Or Cookie Too Large"를 받았고
// (2026-11-12), 대곽나루가 32KB 로 올렸다(server_connection d14f3fd). 입구들이 헤더를 더 붙이므로 여유를 두고, 이보다 긴 헤더는 Worker 로.
const MAX_HEADER_LINE = 24000
const CIRCUIT_MS = 30_000

let skipUntil = 0

/** 시험용 — 회로(서버 건너뛰기) 상태를 비운다 */
export function resetCircuit() {
  skipUntil = 0
}

function tag(res, origin) {
  const out = new Response(res.body, res)
  out.headers.set('x-dshs-origin', origin)
  return out
}

async function toWorker(request, env, body) {
  const retry = new Request(request.url, { method: request.method, headers: request.headers, body, redirect: 'manual' })
  return tag(await env.APP.fetch(retry), 'worker')
}

// 본문을 limit 까지 담는다. 넘으면 담은 앞부분 + 나머지를 이어 붙인 스트림(다시 보낼 수 없음)
async function bufferUpTo(stream, limit) {
  const reader = stream.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
    if (size > limit) {
      const rest = new ReadableStream({
        start(controller) {
          for (const c of chunks) controller.enqueue(c)
        },
        async pull(controller) {
          const next = await reader.read()
          if (next.done) controller.close()
          else controller.enqueue(next.value)
        },
        cancel(reason) {
          return reader.cancel(reason)
        },
      })
      return { stream: rest }
    }
  }
  const all = new Uint8Array(size)
  let off = 0
  for (const c of chunks) {
    all.set(c, off)
    off += c.byteLength
  }
  return { buffer: all.buffer }
}

export async function forwardWithFallback(
  request,
  env,
  { fetchImpl = fetch, timeoutMs = 10_000, staticTimeoutMs = 3_000, longTimeoutMs = 60_000, maxBuffer = MAX_BUFFER, now = Date.now } = {},
) {
  if (!env.ORIGIN_HOST || now() < skipUntil) return tag(await env.APP.fetch(request), 'worker')
  for (const [name, value] of request.headers) {
    if (name.length + value.length > MAX_HEADER_LINE) return tag(await env.APP.fetch(request), 'worker')
  }

  const url = new URL(request.url)
  const isRead = request.method === 'GET' || request.method === 'HEAD'
  const pageRead = isRead && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
  let body = null
  let replayable = true
  if (!isRead && request.body) {
    const got = await bufferUpTo(request.body, maxBuffer)
    body = got.buffer ?? got.stream
    replayable = !!got.buffer
  }
  const workerOrStatus = (status, text) =>
    replayable ? toWorker(request, env, body) : new Response(text, { status, headers: { 'x-dshs-origin': 'none' } })

  const headers = new Headers(request.headers)
  headers.delete(IP_HEADER)
  headers.delete(KEY_HEADER)
  headers.set(IP_HEADER, request.headers.get('cf-connecting-ip') || '')
  headers.set(KEY_HEADER, env.ORIGIN_KEY || '')
  headers.set('x-forwarded-host', env.PUBLIC_HOST || url.host)

  // 머리(응답 헤더)가 올 때까지만 시간을 잰다 — 본문 스트림(포스터 heartbeat 등)은 끊지 않는다
  const limit = url.pathname.startsWith('/_next/static/') ? staticTimeoutMs : pageRead ? timeoutMs : longTimeoutMs
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, limit)
  let res
  try {
    res = await fetchImpl(`https://${env.ORIGIN_HOST}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      signal: controller.signal,
      ...(body && !replayable ? { duplex: 'half' } : {}),
    })
  } catch {
    clearTimeout(timer)
    skipUntil = now() + CIRCUIT_MS
    if (timedOut && !pageRead) return new Response('origin timeout', { status: 504, headers: { 'x-dshs-origin': 'none' } })
    return workerOrStatus(502, 'origin unreachable')
  }
  clearTimeout(timer)

  const fromApp = /application\/json/i.test(res.headers.get('content-type') || '')
  const headerTooLarge = res.status === 400 && /Request Header Or Cookie Too Large/i.test(await res.clone().text().catch(() => ''))
  if (UNREACHED.has(res.status) || headerTooLarge) {
    if (UNREACHED.has(res.status)) skipUntil = now() + CIRCUIT_MS
    if (replayable) {
      await res.body?.cancel()
      return toWorker(request, env, body)
    }
  } else if (MAYBE_PROCESSED.has(res.status) && !fromApp) {
    if (res.status === 502 || res.status === 503) skipUntil = now() + CIRCUIT_MS
    if (pageRead) {
      await res.body?.cancel()
      return toWorker(request, env, body)
    }
  }

  const out = tag(res, 'naru')
  // 원 주소로 가는 리다이렉트는 사용자 주소로(앱은 공개 주소를 쓰지만 혹시 원 주소가 새면)
  const location = out.headers.get('location')
  if (location) {
    try {
      const loc = new URL(location, url)
      if (loc.host === env.ORIGIN_HOST) {
        loc.host = url.host
        out.headers.set('location', loc.toString())
      }
    } catch {
      // 이상한 Location 은 그대로
    }
  }
  return out
}
