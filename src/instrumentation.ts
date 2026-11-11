// Next 가 서버를 켤 때 한 번 부른다. 대곽나루 서버(Node, DSHS_RUNTIME=node)에서만 무언가 한다 — Worker 는 그냥 지나간다.
// 설계: docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md
import { isNodeServer } from '@/lib/runtime'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !isNodeServer()) return
  const { installSafeDispatcher } = await import('@/lib/ssrf-node')
  installSafeDispatcher()
  console.log('[naru] 서버 fetch 사설 주소 차단 켬')
}
