"use client";

import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { toneClasses, type FormTone } from "./tone";

type SelectCardProps = {
  selected: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  label: string;
  description?: string;
  tone?: FormTone;
  className?: string;
};

/**
 * 아이콘 타일 + 라벨 + 한 줄 설명이 세로로 쌓인 선택 카드(프로그램 종류 등). 그리드 안에서 쓴다.
 * div 기반이라 role=button·tabIndex·Enter/Space를 직접 단다(CLAUDE.md 키보드 접근성 규칙).
 */
export function SelectCard({ selected, onSelect, icon: Icon, label, description, tone = "neutral", className }: SelectCardProps) {
  const t = toneClasses(tone);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "flex cursor-pointer flex-col gap-2.5 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        selected
          ? t.selected
          : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600",
        className,
      )}
    >
      <span className={cn("inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px]", selected ? t.mark : t.tile)} aria-hidden>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{description}</span>}
      </span>
    </div>
  );
}
