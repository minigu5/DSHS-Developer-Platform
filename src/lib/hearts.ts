// 하트(GitHub 별 같은 즐겨찾기) 표시 로직 — 서버·브라우저 공용 순수 함수.

/**
 * 하트 수 칸 `projects.heart_count`(트리거가 채움, migration 20261108120000)가 붙은 행.
 * project_hearts 는 본인 행만 읽혀서 project_hearts(count) 집계로는 남의 하트를 못 센다.
 */
export type HeartCountEmbed = { heart_count?: number | null }

export function heartCountOf(p: HeartCountEmbed): number {
  return p.heart_count ?? 0
}
