"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loadMoreFeed } from "@/lib/admin/actions";
import { FEED_FILTERS, kindsOf, type FeedFilter } from "@/lib/admin/feed-filters";
import type { FeedItem } from "@/lib/admin/today";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

import { SMALL_BTN } from "./confirm-action";
import { ContentActions } from "./content-actions";
import { ContentLine } from "./content-line";

const PAGE = 50;

/** 최신 글 — 종류 칩 + 50개씩 더 보기. 처음 50개(전체)는 서버가 넘겨준다 */
export function ContentFeed({ initial }: { initial: FeedItem[] }) {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE);
  const [pending, start] = useTransition();

  // 서버가 새로 읽으면(지우기 뒤 router.refresh) 전체 목록을 다시 받는다
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial && filter === "all") {
    setSeenInitial(initial);
    setItems(initial);
    setHasMore(initial.length >= PAGE);
  }

  const load = (next: FeedFilter, before: string | null) =>
    start(async () => {
      try {
        const rows = await loadMoreFeed(kindsOf(next), before ?? new Date(Date.now() + 60_000).toISOString());
        setItems((prev) => (before ? [...prev, ...rows] : rows));
        setHasMore(rows.length >= PAGE);
      } catch {
        toast.error("글을 불러오지 못했어요.");
      }
    });

  const choose = (next: FeedFilter) => {
    setFilter(next);
    if (next === "all") {
      setItems(initial);
      setHasMore(initial.length >= PAGE);
    } else {
      load(next, null);
    }
  };

  const chip = SECTION_COLORS.admin.chip;
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {FEED_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => choose(f.value)}
            className={cn(
              "h-8 rounded-full px-3 text-sm font-medium transition-colors",
              filter === f.value ? chip : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {items.length === 0 && !pending ? (
        <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">아직 글이 없어요.</p>
      ) : (
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((i) => (
            <ContentLine key={`${i.kind}:${i.id}`} item={i} actions={<ContentActions item={i} />} />
          ))}
        </div>
      )}
      {pending && (
        <p className="flex justify-center py-4 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">불러오는 중…</span>
        </p>
      )}
      {hasMore && !pending && items.length > 0 && (
        <div className="mt-3 flex justify-center">
          <button type="button" className={SMALL_BTN} onClick={() => load(filter, items[items.length - 1].createdAt)}>
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
