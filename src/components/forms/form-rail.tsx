"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type FormRailSection = { id: string; title: string; done: boolean };

type FormRailProps = {
  sections: FormRailSection[];
  requiredDone: number;
  requiredTotal: number;
  className?: string;
};

/**
 * 등록 폼 데스크탑 목차 레일. 카드마다 완료 원(필수 항목이 다 채워지면 체크), 현재 보이는 카드 강조,
 * 클릭하면 해당 카드로 부드럽게 스크롤. 아래에 "필수 항목 N / M".
 */
export function FormRail({ sections, requiredDone, requiredTotal, className }: FormRailProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  // sections 배열은 렌더마다 새로 만들어지므로 id 목록이 바뀔 때만 다시 관찰한다
  const idsKey = sections.map((s) => s.id).join("|");

  useEffect(() => {
    const els = idsKey.split("|").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [idsKey]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  return (
    <nav aria-label="폼 목차" className={cn("grid gap-0.5 text-[13px]", className)}>
      {sections.map((s) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            aria-current={active ? "location" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
            )}
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                s.done ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950" : "border-zinc-300 dark:border-zinc-700",
              )}
              aria-hidden
            >
              {s.done && <Check className="h-[11px] w-[11px]" strokeWidth={3} />}
            </span>
            {s.title}
          </button>
        );
      })}
      <p className="mt-2.5 border-t border-zinc-100 px-2.5 pt-3 text-xs text-zinc-500 tabular-nums dark:border-zinc-800 dark:text-zinc-400">
        필수 항목 {requiredDone} / {requiredTotal}
      </p>
    </nav>
  );
}
