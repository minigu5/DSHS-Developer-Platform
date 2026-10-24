/**
 * 섹션 색 맵 — PageNav 알약, 페이지 머리(PageHero) 아이콘 타일, 주 버튼, 활성 칩이 같은 색을 쓴다.
 *
 * 규칙(2026-10-24 하위 페이지 톤 통일):
 * - 섹션 색은 세 군데만: 머리 타일(연한 배경) · 페이지의 주 버튼 · 활성 칩. 나머지는 zinc.
 * - 선택이 많은 폼(프로젝트 등록·수정)은 선택 상태에 섹션 색을 쓰지 않는다(무채색 반전).
 * - 흰 글자 배경은 WCAG AA(4.5:1)를 넘는 단계만: blue-600, emerald-700, purple-600, tip-600, orange-700, sky-700.
 * - 개발 팁은 `tip-*` 커스텀 토큰(globals.css @theme). Tailwind pink-600은 oklch라 승인된 색과 달라 쓰지 않는다.
 */
export type SectionKey = "explore" | "new" | "guide" | "tips" | "haejwo" | "announcements";

export type SectionColor = {
  /** 진한 배경 — PageNav 활성 알약·MobileNav 원 */
  pill: string;
  /** 머리 아이콘 타일 — 연한 배경 + 진한 글자 */
  tile: string;
  /** 주 버튼 — 진한 배경 + 흰 글자 + hover */
  button: string;
  /** 활성 칩(필터·세그먼트) — 연한 배경 + 진한 글자 */
  chip: string;
  /** 강조 글자만 */
  text: string;
  /** 선택 테두리(위저드 단일 선택) */
  border: string;
};

export const SECTION_COLORS: Record<SectionKey, SectionColor> = {
  explore: {
    pill: "bg-blue-600",
    tile: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-600 dark:border-blue-400",
  },
  new: {
    pill: "bg-emerald-700",
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    button: "bg-emerald-700 hover:bg-emerald-800 text-white",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-700 dark:border-emerald-400",
  },
  guide: {
    pill: "bg-purple-600",
    tile: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
    chip: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-600 dark:border-purple-400",
  },
  tips: {
    pill: "bg-tip-600",
    tile: "bg-tip-100 text-tip-700 dark:bg-tip-950 dark:text-tip-300",
    button: "bg-tip-600 hover:bg-tip-700 text-white",
    chip: "bg-tip-100 text-tip-700 dark:bg-tip-950 dark:text-tip-300",
    text: "text-tip-700 dark:text-tip-300",
    border: "border-tip-600 dark:border-tip-300",
  },
  haejwo: {
    pill: "bg-orange-700",
    tile: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    button: "bg-orange-700 hover:bg-orange-800 text-white",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-700 dark:border-orange-400",
  },
  announcements: {
    pill: "bg-sky-700",
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    button: "bg-sky-700 hover:bg-sky-800 text-white",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-700 dark:border-sky-400",
  },
};
