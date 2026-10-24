import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  getDocMeta,
  getLatestDoc,
  getRevertedMap,
  isSourceStale,
  listHistoryPage,
} from "@/lib/guide-wiki/read";
import { listUsages } from "@/lib/guide-wiki/source";
import { DocHeader } from "@/components/guide-wiki/doc-header";
import { HistoryList } from "@/components/guide-wiki/history-list";
import { HistoryMore } from "@/components/guide-wiki/history-more";
import { StaleBanner } from "@/components/guide-wiki/stale-banner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "고친 기록 — DSHS Developer Platform",
};

interface HistoryPageProps {
  params: Promise<{ key: string }>;
}

export default async function GuideWikiHistoryPage({ params }: HistoryPageProps) {
  const { key } = await params;

  const latest = await getLatestDoc(key);
  if (!latest) notFound();

  const supabase = await createClient();
  const [meta, page, revertedMap, stale, usages, auth] = await Promise.all([
    getDocMeta(key),
    listHistoryPage(key),
    getRevertedMap(key),
    isSourceStale(key),
    listUsages(key),
    supabase.auth.getUser(),
  ]);
  const signedIn = auth.data.user !== null;
  const { items, hasMore } = page;
  const latestRev = meta?.latestRev ?? 0;

  const reverted: Record<number, number> = {};
  for (const item of items) {
    const by = revertedMap.get(item.revNo);
    if (by !== undefined) reverted[item.revNo] = by;
  }

  const historyPath = `/guide-wiki/${key}/history`;
  const editHref = `/guide-wiki/${key}/edit`;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="px-6 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <DocHeader
            backHref={usages[0]?.href ?? "/guide"}
            backLabel="가이드로"
            eyebrow="고친 기록"
            title={latest.doc.title}
            usages={usages}
          />

          <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {meta
              ? `버전 ${meta.latestRev}개 · 기여자 ${meta.contributors}명. 어느 버전으로든 되돌릴 수 있고, 되돌린 것도 새 버전으로 남아요.`
              : "아직 아무도 고치지 않았어요. 고치면 여기에 기록이 남고, 어느 버전으로든 되돌릴 수 있어요."}
          </p>

          {stale && latestRev > 0 && (
            <div className="mt-5">
              <StaleBanner
                docKey={key}
                baseRev={latestRev}
                loginHref={signedIn ? undefined : `/login?next=${encodeURIComponent(historyPath)}`}
              />
            </div>
          )}

          <div className="mt-7">
            {items.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-[20px] border border-zinc-200 p-5 dark:border-zinc-800">
                <p className="text-[15px] text-zinc-800 dark:text-zinc-100">
                  저장소 원본 · 아직 아무도 안 고쳤어요
                </p>
                <Link
                  href={editHref}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 sm:min-h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  이 가이드 고쳐 보기
                </Link>
              </div>
            ) : (
              <HistoryList
                docKey={key}
                items={items}
                latestRev={latestRev}
                reverted={reverted}
                signedIn={signedIn}
              >
                {hasMore && (
                  <HistoryMore
                    key={latestRev}
                    docKey={key}
                    oldestRev={items[items.length - 1].revNo}
                    latestRev={latestRev}
                    signedIn={signedIn}
                  />
                )}
              </HistoryList>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
