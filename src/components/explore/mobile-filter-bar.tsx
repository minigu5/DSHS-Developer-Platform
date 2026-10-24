"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PROJECT_TYPES, PLATFORMS, FEATURES } from "@/lib/constants";
import { TYPE_ICONS, PLATFORM_ICONS, CATEGORY_ICONS } from "@/lib/type-icons";

type GroupKey = "type" | "category" | "platform";

type MobileFilterBarProps = {
  selectedTypes: string[];
  selectedCategories: string[];
  selectedPlatforms: string[];
  onToggleType: (value: string, checked: boolean) => void;
  onToggleCategory: (value: string, checked: boolean) => void;
  onTogglePlatform: (value: string, checked: boolean) => void;
  onReset: () => void;
  /** 정렬 드롭다운(상태는 부모가 가짐) — 바 오른쪽 끝에 놓인다 */
  sortButton: ReactNode;
};

const GROUPS: Array<{
  key: GroupKey;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  icons: Record<string, LucideIcon>;
}> = [
  { key: "type", label: "종류", options: PROJECT_TYPES, icons: TYPE_ICONS },
  { key: "category", label: "카테고리", options: FEATURES, icons: CATEGORY_ICONS },
  { key: "platform", label: "플랫폼", options: PLATFORMS, icons: PLATFORM_ICONS },
];

/**
 * 탐색 모바일 필터 바 — 머리 아래 헤더 밑에 고정. 데스크탑 사이드바 대신 가로 스크롤 한 줄:
 * [종류 ▾][카테고리 ▾][플랫폼 ▾] | 선택된 값 칩(× 해제) … [정렬].
 * 드롭다운은 `absolute top-full` 패널이라 아래 내용이 밀리지 않는다. 바깥 클릭·Esc로 닫힌다.
 */
export function MobileFilterBar({
  selectedTypes,
  selectedCategories,
  selectedPlatforms,
  onToggleType,
  onToggleCategory,
  onTogglePlatform,
  onReset,
  sortButton,
}: MobileFilterBarProps) {
  const [open, setOpen] = useState<GroupKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedOf = (key: GroupKey) =>
    key === "type" ? selectedTypes : key === "category" ? selectedCategories : selectedPlatforms;
  const toggleOf = (key: GroupKey) =>
    key === "type" ? onToggleType : key === "category" ? onToggleCategory : onTogglePlatform;

  const activeChips = GROUPS.flatMap((g) =>
    selectedOf(g.key).map((value) => ({
      key: g.key,
      value,
      label: g.options.find((o) => o.value === value)?.label ?? value,
      Icon: g.icons[value],
    })),
  );
  const activeCount = activeChips.length;

  return (
    <div
      ref={rootRef}
      className="sticky top-16 z-20 border-b border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex h-14 items-center gap-2 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((g) => {
          const count = selectedOf(g.key).length;
          const isOpen = open === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setOpen(isOpen ? null : g.key)}
              aria-expanded={isOpen}
              aria-controls={`filter-panel-${g.key}`}
              className={cn(
                "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border bg-white px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors dark:bg-zinc-900",
                isOpen
                  ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
              )}
            >
              {g.label}
              {count > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold tabular-nums text-white">
                  {count}
                </span>
              )}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden />
            </button>
          );
        })}

        {activeCount > 0 && (
          <>
            <span className="h-[18px] w-px shrink-0 bg-zinc-200 dark:bg-zinc-800" aria-hidden />
            {activeChips.map((chip) => (
              <button
                key={`${chip.key}-${chip.value}`}
                type="button"
                onClick={() => toggleOf(chip.key)(chip.value, false)}
                aria-label={`${chip.label} 필터 해제`}
                className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full bg-blue-50 pl-3 pr-2.5 text-[13px] font-medium whitespace-nowrap text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {chip.Icon && <chip.Icon className="h-3.5 w-3.5" aria-hidden />}
                {chip.label}
                <X className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </button>
            ))}
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 rounded-sm text-[13px] font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              초기화
            </button>
          </>
        )}

        <div className="ml-auto shrink-0 pl-2">{sortButton}</div>
      </div>

      {open && (
        <div
          id={`filter-panel-${open}`}
          className="absolute left-0 right-0 top-full z-30 mx-6 mt-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg animate-in fade-in slide-in-from-top-2 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap gap-2">
            {GROUPS.find((g) => g.key === open)!.options.map(({ value, label }) => {
              const group = GROUPS.find((g) => g.key === open)!;
              const Icon = group.icons[value];
              const active = selectedOf(open).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleOf(open)(value, !active)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
