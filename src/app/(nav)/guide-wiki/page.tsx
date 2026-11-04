import type { Metadata } from "next";
import Link from "@/components/shared/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { History, Map as MapIcon, Pencil } from "lucide-react";

import { listDocSummaries } from "@/lib/guide-wiki/read";
import { listGuideMap } from "@/lib/guide-wiki/source";
import { PageHero } from "@/components/shared/page-hero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "가이드 전체 지도 — DSHS Developer Platform",
};

const CARD_BUTTON =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:min-h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white";

/**
 * 가이드 조각 전체를 장별로 한눈에 — 위저드를 끝까지 답하지 않아도 고칠 조각을 골라 들어간다.
 * 조각 하나를 고치면 그 조각을 쓰는 모든 가이드에 한꺼번에 반영된다.
 */
export default async function GuideWikiMapPage() {
  const chapters = listGuideMap();
  const summaries = await listDocSummaries();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="guide"
        icon={MapIcon}
        title="가이드 전체 지도"
        description="가이드는 장마다 조각으로 나뉘어 있어요. 조각 하나를 고치면 그 조각을 쓰는 가이드가 전부 한꺼번에 바뀌어요."
        actions={
          <Link
            href="/guide-wiki/changes"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-purple-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            <History className="h-4 w-4" aria-hidden />
            최근 바뀜 보기
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <div className="flex flex-col gap-10">
          {chapters.map((ch) => (
            <section key={ch.no} aria-labelledby={`chapter-${ch.no}`}>
              <h2
                id={`chapter-${ch.no}`}
                className="font-heading text-lg font-bold text-zinc-900 dark:text-white"
              >
                {ch.no}장 · {ch.name}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ch.fragments.map((f) => {
                  const s = summaries.get(f.key);
                  const base = `/guide-wiki/${f.key}`;
                  return (
                    <li
                      key={f.key}
                      className="flex flex-col gap-3 rounded-[20px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                          {f.title}
                        </h3>
                        <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
                          가이드 {f.usageCount}곳에 쓰여요
                        </p>
                        <p
                          className="text-xs text-zinc-500 dark:text-zinc-400"
                          suppressHydrationWarning
                        >
                          {s?.lastAuthor && s.lastAt
                            ? `${s.lastAuthor.nickname}님이 ${formatDistanceToNow(new Date(s.lastAt), { addSuffix: true, locale: ko })} 고침 · 버전 ${s.latestRev}`
                            : "아직 아무도 안 고쳤어요"}
                        </p>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        <Link
                          href={`${base}/edit?from=${encodeURIComponent("/guide-wiki")}`}
                          aria-label={`${f.title} 고치기`}
                          className={CARD_BUTTON}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          고치기
                        </Link>
                        <Link
                          href={`${base}/history`}
                          aria-label={`${f.title} 기록`}
                          className={CARD_BUTTON}
                        >
                          <History className="h-3.5 w-3.5" aria-hidden />
                          기록
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
