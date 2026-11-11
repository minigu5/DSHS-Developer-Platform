// Next 가 서버를 켤 때 한 번 부른다. 대곽나루 서버(Node, DSHS_RUNTIME=node)에서만 무언가 한다 — Worker 는 그냥 지나간다.
// 설계: docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md
import { isNodeServer } from '@/lib/runtime'

// 배포 재시작 때 포스터 AI 일감(Gemini 12~90초)을 기다리는 최대 시간. systemd TimeoutStopSec(120초)보다 짧게.
const DRAIN_MS = 100_000

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !isNodeServer()) return
  const { installSafeDispatcher } = await import('@/lib/ssrf-node')
  await installSafeDispatcher()
  console.log('[naru] 서버 fetch 사설 주소 차단 켬')

  // 유닛이 NEXT_MANUAL_SIG_HANDLE=true 를 넣어 Next 가 신호에 바로 나가지 않는다. 기다리는 동안 서버는 닫지 않고
  // 계속 요청을 받는다 — 포트는 systemd 소켓 것이라 새 프로세스는 이 프로세스가 나간 뒤에 뜬다.
  const { drainBackgroundJobs } = await import('@/lib/posters/node-jobs')
  let stopping = false
  const stop = async (signal: string) => {
    if (stopping) return
    stopping = true
    console.log(`[naru] ${signal} — 뒤에서 하던 일 기다림`)
    const left = await drainBackgroundJobs(DRAIN_MS)
    if (left > 0) console.error(`[naru] 못 끝낸 일 ${left}개를 두고 멈춤`)
    process.exit(0)
  }
  process.on('SIGTERM', () => void stop('SIGTERM'))
  process.on('SIGINT', () => void stop('SIGINT'))
}
