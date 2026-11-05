// 오류 화면(src/app/error.tsx·global-error.tsx)이 쓰는 판단 — 배포 직후 옛 화면과 새 서버가 엇갈려 난 오류인가.
// 배포 때마다 JS 파일 이름·서버 액션 id 가 바뀌어, 열려 있던 화면이 사라진 파일·액션을 찾으면 브라우저에서 터진다
// (2026-11-05 배포 직후 "This page couldn't load"가 몇 분 동안 반복됨). 이런 오류는 새로 고치면 풀리므로 한 번 자동으로 새로 고친다.

const STALE_PATTERNS = [
  /ChunkLoadError/i,
  /Loading (CSS )?chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Failed to find Server Action/i,
  /Server Action .* was not found/i,
]

export function isStaleDeployError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const text = `${error.name ?? ''} ${error.message ?? ''}`
  return STALE_PATTERNS.some((p) => p.test(text))
}

/** 자동 새로 고침 사이 최소 간격 — 새로 고쳐도 또 나면 무한 반복하지 않고 오류 화면을 보인다 */
export const AUTO_RELOAD_GAP_MS = 60_000

export function shouldAutoReload(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > AUTO_RELOAD_GAP_MS
}
