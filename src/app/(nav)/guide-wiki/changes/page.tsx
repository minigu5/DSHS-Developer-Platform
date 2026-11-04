import type { Metadata } from "next";
import Link from "@/components/shared/link";

import { createClient } from "@/lib/supabase/server";
import { listRecentChanges } from "@/lib/guide-wiki/read";
import { DocHeader } from "@/components/guide-wiki/doc-header";
import { HistoryRow } from "@/components/guide-wiki/history-list";
import { RecentMore } from "@/components/guide-wiki/recent-more";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "가이드 최근 바뀜 — DSHS Developer Platform",
};

/** 모든 가이드 조각의 고친 기록을 한 목록에(최신순). 장난 수정을 아무나 바로 알아채게. */
export default async function GuideWikiChangesPage() {
  const supabase = await createClient();
  const [page, auth] = await Promise.all([listRecentChanges(), supabase.auth.getUser()]);
  const signedIn = auth.data.user !== null;
  const { items, hasMore, latestRevs, reverted } = page;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="px-6 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <DocHeader
            backHref="/guide-wiki"
            backLabel="가이드 전체 지도로"
            eyebrow="모든 가이드"
            title="최근 바뀜"
            usages={[]}
          />

          <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            누가 어느 가이드를 고쳤는지 최신순으로 모아 보여 줘요. 이상한 수정을 보면 바로 되돌려 주세요 — 되돌린 것도 새 버전으로 남아요.
          </p>

          <div className="mt-7">
            {items.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-[20px] border border-zinc-200 p-5 dark:border-zinc-800">
                <p className="text-[15px] text-zinc-800 dark:text-zinc-100">
                  아직 아무도 가이드를 고치지 않았어요.
                </p>
                <Link
                  href="/guide-wiki"
                  className="inline-flex min-h-11 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 sm:min-h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  고칠 가이드 고르기
                </Link>
              </div>
            ) : (
              <ol
                aria-label="최근 바뀜"
                className="overflow-hidden rounded-[20px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                {items.map((item) => (
                  <HistoryRow
                    key={`${item.docKey}:${item.revNo}`}
                    docKey={item.docKey}
                    docTitle={item.docTitle}
                    item={item}
                    latestRev={latestRevs[item.docKey] ?? item.revNo}
                    revertedBy={reverted[item.docKey]?.[item.revNo]}
                    signedIn={signedIn}
                  />
                ))}
                {hasMore && (
                  <RecentMore
                    // 되돌리기 등으로 새 기록이 생겨 새로고침되면 불러온 쪽을 비운다.
                    key={items[0].createdAt}
                    oldestAt={items[items.length - 1].createdAt}
                    signedIn={signedIn}
                  />
                )}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
