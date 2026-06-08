"use client";

import Link from "next/link";
import { Bell, Pin } from "lucide-react";
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
  promotion: "bg-blue-100/80 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  beta:      "bg-violet-100/80 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  feedback:  "bg-amber-100/80 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  update:    "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  general:   "bg-zinc-100/80 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400",
  admin:     "bg-rose-100/80 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
};

export function AnnouncementTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  // 화면을 여러 번 채우도록 충분히 반복, 짝수로 맞춰 seamless loop
  const minSets = Math.max(2, Math.ceil(12 / items.length));
  const sets = minSets % 2 === 0 ? minSets : minSets + 1;
  const track = Array<TickerItem[]>(sets).fill(items).flat();

  // 절반(sets/2개 세트)이 지나가는 시간 = 한 세트당 아이템 × 4.5초
  const duration = (sets / 2) * items.length * 4.5;

  return (
    <Link
      href="/announcements"
      aria-label="공지사항 보기"
      className="group flex h-7 w-full items-stretch overflow-hidden border-b border-zinc-200/60 bg-white/80 backdrop-blur-md transition-colors duration-200 hover:bg-zinc-50/90 dark:border-zinc-800/60 dark:bg-zinc-950/80 dark:hover:bg-zinc-900/60"
    >
      {/* 왼쪽 아이콘 */}
      <div className="relative z-10 flex shrink-0 items-center gap-1.5 border-r border-zinc-200/60 px-3 dark:border-zinc-800/60">
        <Bell className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
      </div>

      {/* 스크롤 트랙 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 왼쪽 fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white/80 to-transparent dark:from-zinc-950/80" />

        <div
          className="flex h-full items-center whitespace-nowrap"
          style={{ animation: `announcement-ticker ${duration}s linear infinite` }}
        >
          {track.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-6 text-[12px]"
            >
              {item.is_pinned && (
                <Pin className="h-2.5 w-2.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              )}
              <span className={`inline-block rounded-full px-1.5 py-px text-[10px] font-medium leading-none ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general}`}>
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">{item.title}</span>
              <span className="text-zinc-200 dark:text-zinc-800">·</span>
            </span>
          ))}
        </div>

        {/* 오른쪽 fade */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/80 to-transparent dark:from-zinc-950/80" />
      </div>

      {/* 우측 화살표 */}
      <div className="relative z-10 flex shrink-0 items-center px-3 text-zinc-300 transition-colors duration-200 group-hover:text-zinc-400 dark:text-zinc-700 dark:group-hover:text-zinc-500">
        <svg className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
