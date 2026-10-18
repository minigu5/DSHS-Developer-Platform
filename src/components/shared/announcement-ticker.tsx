"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Bell, ChevronRight, Pause, Pin, Play } from "lucide-react";
import { ANNOUNCEMENT_CATEGORIES, ADMIN_ANNOUNCEMENT_CATEGORY } from "@/lib/constants";

export type TickerItem = {
  id: string;
  title: string;
  category: string;
  is_pinned: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(ANNOUNCEMENT_CATEGORIES.map((c) => [c.value, c.label])),
  [ADMIN_ANNOUNCEMENT_CATEGORY.value]: ADMIN_ANNOUNCEMENT_CATEGORY.label,
};

const CATEGORY_COLORS: Record<string, string> = {
  promotion: "bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  beta:      "bg-violet-100/80 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  feedback:  "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  update:    "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  general:   "bg-zinc-100/80 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400",
  admin:     "bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export function AnnouncementTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return null;

  // 화면을 여러 번 채우도록 충분히 반복, 짝수로 맞춰 seamless loop
  const minSets = Math.max(2, Math.ceil(12 / items.length));
  const sets = minSets % 2 === 0 ? minSets : minSets + 1;
  const track = Array<TickerItem[]>(sets).fill(items).flat();

  // 절반(sets/2개 세트)이 지나가는 시간 = 한 세트당 아이템 × 4.5초
  const duration = (sets / 2) * items.length * 4.5;

  return (
    <div className="flex h-7 w-full items-stretch border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/announcements"
        aria-label="공지사항 보기"
        className="group flex min-w-0 flex-1 items-stretch overflow-hidden transition-colors duration-200 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-zinc-900"
      >
        {/* 왼쪽 아이콘 */}
        <div className="relative z-10 flex shrink-0 items-center gap-1.5 border-r border-zinc-200 px-3 dark:border-zinc-800">
          <Bell className="h-3 w-3 text-zinc-500" aria-hidden />
        </div>

        {/* 스크롤 트랙 — hover·포커스 시 멈추고, 동작 줄이기 설정이면 정지 */}
        <div className="relative flex-1 overflow-hidden" aria-hidden>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent dark:from-zinc-950" />

          <div
            className="announcement-ticker-track flex h-full items-center whitespace-nowrap"
            data-paused={paused || undefined}
            style={{ "--ticker-duration": `${duration}s` } as CSSProperties}
          >
            {track.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-6 text-xs"
              >
                {item.is_pinned && (
                  <Pin className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                )}
                <span className={`inline-block rounded-full px-1.5 py-px text-[11px] font-medium leading-none ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general}`}>
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">{item.title}</span>
              </span>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent dark:from-zinc-950" />
        </div>

        {/* 우측 화살표 */}
        <div className="relative z-10 flex shrink-0 items-center px-3 text-zinc-400 transition-colors duration-200 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-400">
          <ChevronRight className="h-3 w-3" aria-hidden />
        </div>
      </Link>

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "공지 흐름 재생" : "공지 흐름 일시정지"}
        aria-pressed={paused}
        className="flex w-9 shrink-0 items-center justify-center border-l border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 motion-reduce:hidden dark:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
      >
        {paused ? <Play className="h-3 w-3" aria-hidden /> : <Pause className="h-3 w-3" aria-hidden />}
      </button>
    </div>
  );
}
