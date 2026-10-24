"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { loadMoreRevisions, type HistoryPage } from "@/lib/guide-wiki/actions";
import { HistoryRow } from "@/components/guide-wiki/history-list";

interface HistoryMoreProps {
  docKey: string;
  /** 지금 화면에 보이는 가장 오래된 버전. 이보다 오래된 쪽을 불러온다. */
  oldestRev: number;
  latestRev: number;
  signedIn: boolean;
}

/** 고친 기록 목록 `<ol>` 맨 아래에 이어 붙는 "더 보기". 불러온 줄은 같은 목록에 쌓인다. */
export function HistoryMore({ docKey, oldestRev, latestRev, signedIn }: HistoryMoreProps) {
  const [pages, setPages] = useState<HistoryPage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const before = pages.at(-1)?.items.at(-1)?.revNo ?? oldestRev;

  async function loadMore() {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const page = await loadMoreRevisions(docKey, before);
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
            key={item.revNo}
            docKey={docKey}
            item={item}
            latestRev={latestRev}
            revertedBy={page.reverted[item.revNo]}
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
