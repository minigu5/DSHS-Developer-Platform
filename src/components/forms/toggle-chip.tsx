"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { toneClasses, type FormTone } from "./tone";

type ToggleChipProps = {
  pressed: boolean;
  onToggle: () => void;
  label: string;
  icon?: LucideIcon;
  /** 잠긴 선택(웹사이트 선택 시 전체 플랫폼) — 눌린 모양을 유지한 채 흐리게, Tab 순서에서 제외 */
  disabled?: boolean;
  tone?: FormTone;
  className?: string;
};

/** 다중 선택용 알약 칩(플랫폼·카테고리·라이선스·관심 분야). `aria-pressed`로 상태를 알린다. */
export function ToggleChip({ pressed, onToggle, label, icon: Icon, disabled = false, tone = "neutral", className }: ToggleChipProps) {
  const t = toneClasses(tone);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onToggle}
      className={cn(
        "inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        pressed
          ? t.chip
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600",
        disabled && "cursor-default opacity-35",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );
}
