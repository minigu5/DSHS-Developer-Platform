"use client";

import { Check, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { toneClasses, type FormTone } from "./tone";

type ChoiceRowProps = {
  selected: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  label: string;
  description?: string;
  tone?: FormTone;
  disabled?: boolean;
  /** 비활성 이유(가이드 위저드) — 설명 자리에 대신 보인다 */
  disabledReason?: string | null;
  className?: string;
};

/**
 * 가로 한 줄짜리 선택 행: 아이콘 타일 + 라벨/설명 + 오른쪽 체크 원.
 * 가이드·해줘 위저드(섹션 색)와 등록 폼의 양자택일(무채색)이 같은 마크업을 쓴다.
 */
export function ChoiceRow({
  selected,
  onSelect,
  icon: Icon,
  label,
  description,
  tone = "neutral",
  disabled = false,
  disabledReason,
  className,
}: ChoiceRowProps) {
  const t = toneClasses(tone);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-[color,background-color,border-color,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        disabled
          ? "cursor-not-allowed border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40"
          : selected
            ? t.selected
            : "border-zinc-200 bg-white hover:border-zinc-400 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            disabled ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600" : selected ? t.mark : t.tile,
          )}
          aria-hidden
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-semibold", disabled ? "text-zinc-500" : "text-zinc-900 dark:text-white")}>{label}</span>
        {disabledReason ? (
          <span className="mt-0.5 block text-[13px] text-amber-800 dark:text-amber-400">{disabledReason}</span>
        ) : description ? (
          <span className={cn("mt-0.5 block text-[13px]", disabled ? "text-zinc-500" : "text-zinc-600 dark:text-zinc-400")}>{description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          disabled
            ? "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
            : selected
              ? cn("border-transparent", t.mark)
              : "border-zinc-300 text-transparent dark:border-zinc-700",
        )}
        aria-hidden
      >
        {disabled ? <Lock className="h-3 w-3" /> : <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}
