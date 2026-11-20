// Next 가 서버를 켤 때 한 번 부른다. 대곽나루 서버(Node, DSHS_RUNTIME=node)에서만 무언가 한다 — Worker 는 그냥 지나간다.
// 설계: docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md
import { isNodeServer } from '@/lib/runtime'

// 배포 재시작 때 서버를 닫으며 이미 받은 응답을 마무리하는 시간. systemd TimeoutStopSec(120초)보다 짧게.
const CLOSE_MS = 10_000

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !isNodeServer()) return
  const { installSafeDispatcher, safeDispatcherActive } = await import('@/lib/ssrf-node')
  await installSafeDispatcher()
  // 차단이 실제로 걸렸는지 확인 — 안 걸렸으면 켜지지 않는다(배포 스크립트가 /login 실패로 이전 릴리스로 되돌림)
  if (!(await safeDispatcherActive())) {
    console.error('[naru] 서버 fetch 사설 주소 차단이 안 걸림 — 멈춤')
    process.exit(1)
  }
  console.log('[naru] 서버 fetch 사설 주소 차단 켬')

  // 유닛이 NEXT_MANUAL_SIG_HANDLE=true 를 넣어 Next 가 신호에 바로 나가지 않는다. 포트는 systemd 소켓 것이라
  // 새 프로세스는 이 프로세스가 나간 뒤에 뜬다.
  const { shutdownGracefully } = await import('@/lib/node-shutdown')
  const closeServer = (globalThis as { __dshsCloseServer?: (ms: number) => Promise<void> }).__dshsCloseServer
  let stopping = false
  const stop = (signal: string) => {
    if (stopping) return
    stopping = true
    console.log(`[naru] ${signal} — 서버를 닫고 나감`)
    void shutdownGracefully({
      drain: async () => 0,
      closeServer: closeServer && (() => closeServer(CLOSE_MS)),
      exit: () => process.exit(0),
      log: (m) => console.error(m),
    })
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))
}
