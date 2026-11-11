// 실행 환경 갈림길(2026-11-11, docs/superpowers/specs/2026-11-11-naru-server-hosting-design.md).
// 대곽나루 서버(systemd 유닛이 DSHS_RUNTIME=node 를 넣음)에서만 true — 없으면 지금처럼 Cloudflare Worker 동작.
// 운영 전환 뒤에도 Worker 를 예비로 남기므로 Cloudflare 경로를 지우지 말고 이 값으로 가른다.
export function isNodeServer(): boolean {
  return process.env.DSHS_RUNTIME === 'node'
}
