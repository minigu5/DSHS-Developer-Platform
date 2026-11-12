// 서울 입구에서 대곽나루 서버로 넘기고, 서버가 안 되면 Worker(예비)로 (2026-11-12, docs/25-naru-server.md 「2단계」)
//
// dshs.dev → (이 Pages Function) → https://<ORIGIN_HOST>(대곽나루 학생 주소, 대곽나루 서울 입구 → 노드 nginx → 서버 8080)
// 서버가 연결 실패·502/503·Cloudflare 52x(안 닿음)면 같은 요청을 env.APP(service binding → Worker)으로 다시 보낸다.
// 504·524·시간 초과는 서버가 이미 처리했을 수도 있어서 GET/HEAD 만 다시 보낸다(POST 두 번 처리 방지).
//
// 중계를 두 번 거치면 서버에 보이는 cf-connecting-ip 는 이 함수의 출구 IP 라, 실제 사용자 IP 를 x-dshs-client-ip 로 넘기고
// 비밀 키(x-dshs-relay-key = env.ORIGIN_KEY, 서버 env DSHS_RELAY_KEY 와 같은 값)를 붙인다. 앱은 키가 맞을 때만 믿는다(src/lib/client-ip.ts).
// 브라우저가 보낸 같은 이름의 헤더는 지운다.

const IP_HEADER = 'x-dshs-client-ip'
const KEY_HEADER = 'x-dshs-relay-key'
// 서버가 처리하지 않은 게 확실한 실패 — 무슨 요청이든 Worker 로
const NOT_PROCESSED = new Set([502, 503, 521, 522, 523, 530])
// 처리했을 수도 있는 실패 — GET/HEAD 만 Worker 로
const MAYBE_PROCESSED = new Set([504, 524])
// 이보다 큰 본문은 담아 두지 않고 서버로만 보낸다(실패해도 Worker 로 다시 못 보냄)
const MAX_BUFFER = 12 * 1024 * 1024
// 대곽나루 노드 nginx 는 요청 헤더 한 줄을 8KB 까지만 받는다(넘으면 400 "Request Header Or Cookie Too Large" — 2026-11-12 운영에서 쿠키가 커서
// 막힘). 우리·대곽나루 입구가 헤더를 더 붙이므로 여유를 두고, 이보다 긴 헤더가 있으면 서버로 보내지 않고 Worker(32KB까지 받음)로.
const MAX_HEADER_LINE = 6000

function tag(res, origin) {
  const out = new Response(res.body, res)
  out.headers.set('x-dshs-origin', origin)
  return out
}

async function toWorker(request, env, body) {
  const retry = new Request(request.url, { method: request.method, headers: request.headers, body, redirect: 'manual' })
  return tag(await env.APP.fetch(retry), 'worker')
}

export async function forwardWithFallback(request, env, { fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  if (!env.ORIGIN_HOST) return tag(await env.APP.fetch(request), 'worker')

  for (const [name, value] of request.headers) {
    if (name.length + value.length > MAX_HEADER_LINE) return tag(await env.APP.fetch(request), 'worker')
  }

  const url = new URL(request.url)
  const idempotent = request.method === 'GET' || request.method === 'HEAD'
  let body = null
  let replayable = true
  if (!idempotent && request.body) {
    const size = Number(request.headers.get('content-length') || 0)
    if (size > MAX_BUFFER) {
      body = request.body
      replayable = false
    } else {
      body = await request.arrayBuffer()
    }
  }

  const headers = new Headers(request.headers)
  headers.delete(IP_HEADER)
  headers.delete(KEY_HEADER)
  headers.set(IP_HEADER, request.headers.get('cf-connecting-ip') || '')
  headers.set(KEY_HEADER, env.ORIGIN_KEY || '')
  headers.set('x-forwarded-host', url.host)

  // 머리(응답 헤더)가 올 때까지만 시간을 잰다 — 본문 스트림(포스터 heartbeat 등)은 끊지 않게. POST 는 시간 제한 없음.
  const controller = new AbortController()
  const timer = idempotent ? setTimeout(() => controller.abort(), timeoutMs) : null
  let res
  try {
    res = await fetchImpl(`https://${env.ORIGIN_HOST}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      signal: controller.signal,
    })
  } catch {
    if (timer) clearTimeout(timer)
    if (!replayable) return new Response('origin unreachable', { status: 502, headers: { 'x-dshs-origin': 'none' } })
    return toWorker(request, env, body)
  }
  if (timer) clearTimeout(timer)

  // 노드 nginx 가 헤더가 크다고 거절(위 검사를 빠져나간 경우) — 앱까지 안 갔으니 다시 보내도 된다
  const headerTooLarge = res.status === 400 && /Request Header Or Cookie Too Large/i.test(await res.clone().text().catch(() => ''))
  if (replayable && (headerTooLarge || NOT_PROCESSED.has(res.status) || (idempotent && MAYBE_PROCESSED.has(res.status)))) {
    await res.body?.cancel()
    return toWorker(request, env, body)
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
