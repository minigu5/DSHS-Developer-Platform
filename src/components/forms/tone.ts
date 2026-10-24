import { SECTION_COLORS, type SectionKey } from "@/lib/section-colors";

/**
 * 폼 선택 UI(SelectCard·ToggleChip·ChoiceRow)의 선택 색.
 * - `neutral`(기본): 선택이 많은 폼(프로젝트 등록·수정, 온보딩 관심 분야)용 무채색 반전 — 섹션 색을 선택마다 칠하면 화면이 온통 그 색이 된다.
 * - 섹션 키: 한 화면에서 하나만 고르는 위저드(가이드·해줘 등록)용.
 */
export type FormTone = "neutral" | SectionKey;

export type ToneClasses = {
  /** 선택된 카드/행의 테두리 + 배경 */
  selected: string;
  /** 선택된 아이콘 타일 / 체크 원 */
  mark: string;
  /** 기본 아이콘 타일 */
  tile: string;
  /** 선택된 토글 칩 */
  chip: string;
};

const NEUTRAL: ToneClasses = {
  selected: "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900",
  mark: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950",
  tile: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  chip: "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950",
};

export function toneClasses(tone: FormTone = "neutral"): ToneClasses {
  if (tone === "neutral") return NEUTRAL;
  const c = SECTION_COLORS[tone];
  return {
    selected: `${c.border} ${c.chip.split(" ").filter((k) => k.startsWith("bg-") || k.startsWith("dark:bg-")).join(" ")}`,
    mark: `${c.pill} text-white`,
    tile: c.tile,
    chip: `${c.border} ${c.chip}`,
  };
}
