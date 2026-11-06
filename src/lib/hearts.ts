// 하트(GitHub 별 같은 즐겨찾기) 표시 로직 — 서버·브라우저 공용 순수 함수.

/** PostgREST 집계 `project_hearts(count)`가 붙은 행 */
export type HeartCountEmbed = { project_hearts?: { count: number }[] | null }

export function heartCountOf(p: HeartCountEmbed): number {
  return p.project_hearts?.[0]?.count ?? 0
}
