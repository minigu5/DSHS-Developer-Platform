"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export type HaejwoStatusFilter = "all" | "open" | "done";

export function parseHaejwoStatus(value: string | null | undefined): HaejwoStatusFilter {
  return value === "open" || value === "done" ? value : "all";
}

const TABS: Array<{ value: HaejwoStatusFilter; label: string; href: string }> = [
  { value: "all", label: "전체", href: "/haejwo" },
  { value: "open", label: "구현 요청 중", href: "/haejwo?status=open" },
  { value: "done", label: "완료", href: "/haejwo?status=done" },
];

/**
 * 해줘 목록 도구줄 오른쪽(커뮤니티 탭 옆) 상태 세그먼트. `in_progress`는 설정하는 UI가 없어 항상 0이라 넣지 않는다(스펙 §5.6).
 * 활성 탭은 클라이언트에서 `?status=`를 읽어 정한다 — 서버 페이지는 searchParams를 읽지 않아 ISR(revalidate=30)이 유지된다.
 */
export function HaejwoStatusTabs({ counts }: { counts: { all: number; open: number; done: number } }) {
  const value = parseHaejwoStatus(useSearchParams().get("status"));
  return (
    <nav
      aria-label="상태 필터"
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-zinc-100 p-[3px] [scrollbar-width:none] dark:bg-zinc-800"
    >
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
            )}
          >
            {tab.label}
            <b
              className={cn(
                "font-semibold tabular-nums",
                active ? "text-orange-700 dark:text-orange-300" : "text-zinc-500 dark:text-zinc-500",
              )}
            >
              {counts[tab.value]}
            </b>
          </Link>
        );
      })}
    </nav>
  );
}
