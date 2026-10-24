import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCompare, Info } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatKst } from "@/lib/guide-wiki/format";
import { parseRevParam } from "@/lib/guide-wiki/params";
import { getLatestDoc, getRevision } from "@/lib/guide-wiki/read";
import { listUsages } from "@/lib/guide-wiki/source";
import { DocHeader } from "@/components/guide-wiki/doc-header";
import { DocRender } from "@/components/guide-wiki/doc-render";
import { RevertDialog } from "@/components/guide-wiki/revert-dialog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "옛 버전 보기 — DSHS Developer Platform",
};

const WITHDRAWN = "탈퇴한 사용자";

const COMPARE_LINK =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:min-h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white";

interface RevPageProps {
  params: Promise<{ key: string; n: string }>;
}

export default async function GuideWikiRevPage({ params }: RevPageProps) {
  const { key, n } = await params;
  const revNo = parseRevParam(n);
  if (revNo === null) notFound();

  const supabase = await createClient();
  const [revision, latest, usages, auth] = await Promise.all([
    getRevision(key, revNo),
    getLatestDoc(key),
    listUsages(key),
    supabase.auth.getUser(),
  ]);
  if (!revision || !latest) notFound();

  const signedIn = auth.data.user !== null;
  const latestRev = latest.revNo;
  const isCurrent = revNo === latestRev;
  const { item, doc } = revision;
  const authorName = item.author.nickname ?? WITHDRAWN;
  const base = `/guide-wiki/${key}`;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="px-6 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <DocHeader
            backHref={`${base}/history`}
            backLabel="고친 기록으로"
            eyebrow={isCurrent ? `버전 ${revNo} · 지금 보이는 버전` : `버전 ${revNo} · 옛 버전 보기`}
            title={doc.title}
            usages={usages}
          />

          {!isCurrent && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                <p className="min-w-0 break-words">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    버전 {revNo} · {authorName} ·{" "}
                    <time dateTime={item.createdAt}>{formatKst(item.createdAt)}</time>
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {" "}
                    — 지금 보이는 버전이 아니에요
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                <RevertDialog
                  docKey={key}
                  targetRev={revNo}
                  latestRev={latestRev}
                  signedIn={signedIn}
                />
                <Link
                  href={`${base}/diff?from=${revNo}&to=${latestRev}`}
                  className={COMPARE_LINK}
                >
                  <GitCompare className="h-3.5 w-3.5" aria-hidden />
                  지금 버전과 비교
                </Link>
              </div>
            </div>
          )}

          <div className="mt-7">
            <DocRender steps={doc.steps} />
          </div>
        </div>
      </div>
    </div>
  );
}
