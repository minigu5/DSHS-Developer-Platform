import { ADMIN_ANNOUNCEMENT_CATEGORY, ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

/** 공지 카테고리 값 → 라벨(관리자 포함) */
export const ANNOUNCEMENT_CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(ANNOUNCEMENT_CATEGORIES.map((c) => [c.value, c.label])),
  [ADMIN_ANNOUNCEMENT_CATEGORY.value]: ADMIN_ANNOUNCEMENT_CATEGORY.label,
};

/**
 * 공지 카테고리 알약 색 — 홈 티커·공지 목록 카드·공지 상세가 같은 값을 쓴다.
 * promotion=blue, beta=violet, feedback=amber, update=emerald, general=zinc, admin=rose. 연한 배경(라이트 80% / 다크 30%).
 */
export const ANNOUNCEMENT_CATEGORY_COLORS: Record<string, string> = {
  promotion: "bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  beta: "bg-violet-100/80 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  feedback: "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  update: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  general: "bg-zinc-100/80 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400",
  admin: "bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export function announcementCategoryLabel(category: string): string {
  return ANNOUNCEMENT_CATEGORY_LABELS[category] ?? category;
}

export function announcementCategoryColor(category: string): string {
  return ANNOUNCEMENT_CATEGORY_COLORS[category] ?? ANNOUNCEMENT_CATEGORY_COLORS.general;
}
