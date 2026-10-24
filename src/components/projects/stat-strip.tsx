import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatStripItem = {
  label: string;
  value: ReactNode;
  sub?: string;
};

/**
 * 프로젝트 상세 수치 띠 — 별점·방문·플랫폼·소스코드를 한 줄 카드에 칸으로 나눈다(앱스토어식).
 * 칸이 3개면(방문 수 없음) `sm:grid-cols-3`. 모바일은 2열.
 */
export function StatStrip({ items, className }: { items: StatStripItem[]; className?: string }) {
  const cols = items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        cols,
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "grid gap-1 px-3 py-[18px] text-center",
            index > 0 && "sm:border-l sm:border-zinc-100 sm:dark:border-zinc-800",
            index % 2 === 1 && "border-l border-zinc-100 dark:border-zinc-800",
            index >= 2 && "border-t border-zinc-100 sm:border-t-0 dark:border-zinc-800",
          )}
        >
          <dt className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{item.label}</dt>
          <dd className="inline-flex items-center justify-center gap-1 text-lg font-semibold text-zinc-900 tabular-nums dark:text-white">
            {item.value}
          </dd>
          {item.sub && <dd className="text-[11px] text-zinc-500 dark:text-zinc-400">{item.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
