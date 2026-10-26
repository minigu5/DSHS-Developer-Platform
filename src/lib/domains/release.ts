// 프로젝트의 살아 있는 주소 반납 — 프로젝트 삭제·비공개 전환(src/lib/projects/actions.ts)이 같이 쓴다.
// DB 반납(subdomain_release)이 끝나면 Cloudflare 레코드·바로가기 항목을 지운다. 지우기가 실패해도 DB 는 반납 상태라
// 성공으로 보고 남은 것은 매일 점검이 정리한다. 주소 조회가 실패하면 "없음"으로 보지 않는다 —
// 그렇게 보면 반납하지 않고 성공을 알려서 주소가 남는다.

type DbResult<T> = { data: T | null; error: { message: string } | null }

export type ReleaseDeps = {
  findLive: () => Promise<DbResult<{ id: string }>>
  release: (subdomainId: string) => Promise<DbResult<string[]>>
  removeCloudflare: (ids: string[]) => Promise<void>
  log: (message: string, detail: unknown) => void
}

/** 살아 있는 주소가 없거나 반납했으면 true, 조회·DB 반납이 실패하면 false */
export async function releaseLiveDomainWith(deps: ReleaseDeps): Promise<boolean> {
  const { data: live, error: findError } = await deps.findLive()
  if (findError) {
    deps.log('[projects] 주소 조회 실패', findError)
    return false
  }
  if (!live) return true

  const { data: ids, error } = await deps.release(live.id)
  if (error) {
    deps.log('[projects] 주소 반납 실패', error)
    return false
  }
  if (ids?.length) {
    await deps.removeCloudflare(ids).catch((e) => deps.log('[projects] Cloudflare 레코드 삭제 실패, 매일 점검이 정리', e))
  }
  return true
}
