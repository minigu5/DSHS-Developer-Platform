"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface FoldStepProps {
  /** 'same' = 변경 없는 단계, 'removed' = 삭제된 단계(점선 카드). */
  tone: "same" | "removed";
  /** 번호 칸에 들어갈 글자. 삭제된 단계는 "−". */
  badge: string;
  title: string;
  /** 제목 오른쪽에 붙는 칩들(서버에서 그린 것). */
  chips: ReactNode;
  /** 펼치면 보이는 줄들. */
  children: ReactNode;
}

/** 접었다 펴는 비교 카드. 변경 없는 단계와 삭제된 단계가 쓴다. */
export function FoldStep({ tone, badge, title, chips, children }: FoldStepProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const removed = tone === "removed";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] border",
        removed
          ? "border-dashed border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-12 w-full flex-wrap items-center gap-x-2.5 gap-y-1.5 px-[18px] py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-zinc-900"
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
            removed
              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          )}
        >
          {badge}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 basis-40 break-words text-sm",
            removed
              ? "font-semibold text-rose-800 line-through dark:text-rose-200"
              : "text-zinc-600 dark:text-zinc-400",
          )}
        >
          {title}
        </span>
        {chips}
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          {open ? "접기" : "펼치기"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>
      <div id={panelId} hidden={!open} className="border-t border-zinc-100 py-2 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}
