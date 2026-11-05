// 하트(GitHub 별 같은 즐겨찾기) 표시 로직 — 서버·브라우저 공용 순수 함수.

/** 처음에 보이는 즐겨찾기 카드 수(데스크탑 한 줄). 나머지는 "N개 더 보기"로 펼친다. */
export const FAVORITES_PREVIEW = 2

/** PostgREST 집계 `project_hearts(count)`가 붙은 행 */
export type HeartCountEmbed = { project_hearts?: { count: number }[] | null }

export function heartCountOf(p: HeartCountEmbed): number {
  return p.project_hearts?.[0]?.count ?? 0
}

/** 하트 누른 순서(최신 먼저)대로 프로젝트를 고른다. 볼 수 없어 목록에 없는 id는 버린다. */
export function favoritesInHeartOrder<T extends { id: string }>(projects: T[], heartedIdsNewestFirst: string[]): T[] {
  const byId = new Map(projects.map((p) => [p.id, p]))
  return heartedIdsNewestFirst.flatMap((id) => {
    const p = byId.get(id)
    return p ? [p] : []
  })
}

/** 탐색 맨 위 즐겨찾기 칸 — 뭔가를 찾는 중(검색어·필터)이면 숨긴다. */
export function shouldShowFavorites(
  query: { q: string; types: string[]; categories: string[]; platforms: string[] },
  favoriteCount: number,
): boolean {
  if (favoriteCount === 0) return false
  if (query.q.trim()) return false
  return query.types.length + query.categories.length + query.platforms.length === 0
}
