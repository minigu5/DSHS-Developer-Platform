// /srv/dshs/socket-fd.js — dshs.service 가 `node --require` 로 먼저 읽는다(2026-11-11).
// `next start` 는 포트를 직접 연다. systemd(dshs.socket)가 쥔 8080(fd 3)을 받았으면 그걸 쓰게 첫 listen 을 바꾼다 —
// 재시작하는 동안 온 요청이 거절되지 않고 커널 대기열에서 기다렸다가 새 프로세스가 받는다.
// 받은 게 없으면(손으로 실행) 아무것도 안 한다. 릴리스 밖(/srv/dshs)에 두는 이유: 옛 릴리스로 되돌려도 그대로 돌아야 해서.
// 멈출 때 연결을 끊지 않는다 — 앱(src/instrumentation.ts)이 뒤에서 하던 일을 기다리는 동안 계속 요청을 받는다.
'use strict'
const http = require('http')

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
    const callback = args.find((a) => typeof a === 'function')
    return listen.call(this, { fd: 3 }, callback)
  }
}
