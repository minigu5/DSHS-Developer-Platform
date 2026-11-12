// /usr/local/lib/dshs/preload.js — dshs.service 가 `node --require` 로 먼저 읽는다(2026-11-11). 릴리스 밖에 두는 이유: 옛 릴리스로 되돌려도 그대로 돌아야 해서.
'use strict'
const http = require('http')
const { nextStartArgs, shouldRedirectToSite } = require('./preload-lib.js')

// 1. systemd 가 쥔 포트 받기
// `next start` 는 포트를 직접 연다. systemd(dshs.socket)가 쥔 8080(fd 3)을 받았으면 그걸 쓰게 첫 listen 을 바꾼다 —
// 재시작하는 동안 온 요청이 거절되지 않고 커널 대기열에서 기다렸다가 새 프로세스가 받는다. 받은 게 없으면 아무것도 안 한다.
// 멈출 때는 앱(src/instrumentation.ts)이 뒤에서 하던 일을 기다리는 동안 계속 요청을 받고, 그 뒤 아래 __dshsCloseServer 로 닫는다.
const fromSystemd = process.env.LISTEN_FDS === '1' && process.env.LISTEN_PID === String(process.pid)
// 자식 프로세스가 같은 fd 를 집지 않게 지운다
delete process.env.LISTEN_FDS
delete process.env.LISTEN_PID
delete process.env.LISTEN_FDNAMES

if (fromSystemd) {
  const listen = http.Server.prototype.listen
  let taken = false
  http.Server.prototype.listen = function (...args) {
    if (taken) return listen.apply(this, args)
    taken = true
    const server = this
    const callback = args.find((a) => typeof a === 'function')
    // Next 는 -p 대신 연 뒤의 server.address().port 로 요청 주소를 만든다(아래 2) — 공개 포트 443 으로 알려 준다
    const address = server.address.bind(server)
    server.address = () => {
      const a = address()
      return a && typeof a === 'object' ? { ...a, port: 443 } : a
    }
    // 새 연결을 그만 받고(커널 대기열의 것은 다음 프로세스가 받음), 받은 응답이 끝나길 ms 까지 기다린 뒤 남은 연결을 끊는다
    globalThis.__dshsCloseServer = (ms) =>
      new Promise((resolve) => {
        server.close(() => resolve())
        server.closeIdleConnections()
        setTimeout(() => {
          server.closeAllConnections()
          resolve()
        }, ms).unref()
      })
    return listen.call(server, { fd: 3 }, callback)
  }
}

// 2. 요청 주소를 공개 주소로
// `next start` 는 route handler 의 request.url 을 `<x-forwarded-proto>://<-H>:<연 포트>` 로 만든다(Host 헤더를 안 봄). 그대로면
// http://localhost:8080/… 이 되어 로그인 콜백·클릭 집계 리다이렉트가 localhost 로 갔다(2026-11-11). 그래서 `next start` 뒤에
// `-H <NEXT_PUBLIC_SITE_URL 의 호스트> -p 443` 을 붙이고(위에서 연 포트도 443 으로 알림), 모든 요청을 https 로 표시한다
// → https://<공개 호스트>/… (:443 은 URL 이 지운다). 바깥 요청은 전부 Cloudflare 를 거친 https 이고, 8080 은 노드 nginx 만 닿는다.
if (process.env.DSHS_RUNTIME === 'node') {
  const at = process.argv.indexOf('start')
  if (at >= 0) process.argv.splice(at + 1, 0, ...nextStartArgs(process.env.NEXT_PUBLIC_SITE_URL))
}
let siteOrigin = ''
try {
  siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || '').origin
} catch {
  // 손으로 실행 등 — 돌려보내기 안 함
}
const createServer = http.createServer
http.createServer = function (...args) {
  const i = args.findIndex((a) => typeof a === 'function')
  if (i >= 0) {
    const handler = args[i]
    args[i] = function (req, res) {
      req.headers['x-forwarded-proto'] = 'https'
      // 3. 서울 입구를 거치지 않은 바깥 요청(원 주소로 직접)은 공개 주소로 — preload-lib.js shouldRedirectToSite
      if (siteOrigin && shouldRedirectToSite({ relayKey: process.env.DSHS_RELAY_KEY, headerKey: req.headers['x-dshs-relay-key'], remoteAddress: req.socket.remoteAddress })) {
        res.writeHead(308, { location: siteOrigin + req.url, 'cache-control': 'no-store' })
        return res.end()
      }
      return handler.call(this, req, res)
    }
  }
  return createServer.apply(this, args)
}
