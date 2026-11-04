"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { loadMoreRecentChanges } from "@/lib/guide-wiki/actions";
import type { RecentChangesPage } from "@/lib/guide-wiki/read";
import { HistoryRow } from "@/components/guide-wiki/history-list";

interface RecentMoreProps {
  /** 지금 화면에 보이는 가장 오래된 항목의 시각. 이보다 오래된 쪽을 불러온다. */
  oldestAt: string;
  signedIn: boolean;
}

/** 최근 바뀜 목록 `<ol>` 맨 아래에 이어 붙는 "더 보기". */
export function RecentMore({ oldestAt, signedIn }: RecentMoreProps) {
  const [pages, setPages] = useState<RecentChangesPage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const before = pages.at(-1)?.items.at(-1)?.createdAt ?? oldestAt;

  async function loadMore() {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const page = await loadMoreRecentChanges(before);
      setPages((prev) => [...prev, page]);
      setHasMore(page.hasMore);
    } catch {
      toast.error("기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
    busyRef.current = false;
    setLoading(false);
  }

  return (
    <>
      {pages.flatMap((page) =>
        page.items.map((item) => (
          <HistoryRow
            key={`${item.docKey}:${item.revNo}`}
            docKey={item.docKey}
            docTitle={item.docTitle}
            item={item}
            latestRev={page.latestRevs[item.docKey] ?? item.revNo}
            revertedBy={page.reverted[item.docKey]?.[item.revNo]}
            signedIn={signedIn}
          />
        )),
      )}
      {hasMore && (
        <li className="flex justify-center border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="inline-flex min-h-11 items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {loading ? "불러오는 중…" : "더 보기"}
          </button>
        </li>
      )}
    </>
  );
}
