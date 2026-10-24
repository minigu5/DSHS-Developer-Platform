import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { diffSteps, type StepDiff } from "@/lib/guide-wiki/diff";
import { formatKst } from "@/lib/guide-wiki/format";
import { parseRevParam } from "@/lib/guide-wiki/params";
import { getLatestDoc, getRevision, type RevisionListItem } from "@/lib/guide-wiki/read";
import { listUsages, loadSourceDoc } from "@/lib/guide-wiki/source";
import type { WikiDoc } from "@/lib/guide-wiki/types";
import { DocHeader } from "@/components/guide-wiki/doc-header";
import { Avatar } from "@/components/guide-wiki/history-list";
import { RevertDialog } from "@/components/guide-wiki/revert-dialog";
import { StepDiffView } from "@/components/guide-wiki/step-diff-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "두 버전 비교 — DSHS Developer Platform",
};

const WITHDRAWN = "탈퇴한 사용자";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-full border border-zinc-200 bg-white px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:min-h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white";

const CHIP = "rounded-full px-3 py-1 text-[13px] font-medium";

interface DiffPageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ [name: string]: string | string[] | undefined }>;
}

function summaryChips(diffs: StepDiff[]) {
  let added = 0;
  let removed = 0;
  let edited = 0;
  let moved = 0;
  let folded = 0;
  for (const d of diffs) {
    if (d.kind === "added") added++;
    else if (d.kind === "removed") removed++;
    else if (d.kind === "edited") edited++;
    if (d.moved) moved++;
    if (d.kind === "same" && !d.moved) folded++;
  }
  return { added, removed, edited, moved, folded, changed: added + removed + edited + moved > 0 };
}

function AuthorCard({
  item,
  span,
  action,
}: {
  item: RevisionListItem;
  span: number;
  action: ReactNode;
}) {
  const { nickname, id, avatarUrl, email } = item.author;
  const name = nickname ?? WITHDRAWN;
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-[20px] border border-zinc-200 px-5 py-[18px] dark:border-zinc-800">
      <Avatar name={name} url={nickname !== null ? avatarUrl : null} large />
      <div className="min-w-0 flex-[1_1_240px]">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          {nickname !== null && id !== null ? (
            <Link
              href={`/developers/${id}`}
              className="font-semibold text-zinc-900 hover:underline dark:text-white"
            >
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">{name}</span>
          )}
          <span className="break-all text-zinc-500 dark:text-zinc-400">
            <span aria-hidden>· </span>
            <time dateTime={item.createdAt}>{formatKst(item.createdAt)}</time>
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            {email}
          </span>
        </p>
        <p className="mt-0.5 break-words text-[15px] text-zinc-800 dark:text-zinc-100">
          “{item.summary}”
        </p>
        {span > 1 && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            버전 {item.revNo}을 저장한 사람이에요. 사이 버전 {span - 1}개의 변경도 합쳐서 보여 줘요.
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export default async function GuideWikiDiffPage({ params, searchParams }: DiffPageProps) {
  const { key } = await params;
  const sp = await searchParams;
  const sourceMode = sp.source === "1";

  const latest = await getLatestDoc(key);
  if (!latest) notFound();
  const latestRev = latest.revNo;

  const supabase = await createClient();
  const signedInPromise = supabase.auth.getUser().then((r) => r.data.user !== null);
  const usagesPromise = listUsages(key);

  let fromDoc: WikiDoc;
  let toDoc: WikiDoc;
  let fromRev: number;
  let toRev: number | null = null;
  let toItem: RevisionListItem | null = null;

  if (sourceMode) {
    // 저장해 둔 최신 버전과 지금 저장소 원본을 견준다. 위키 저장본이 없으면 견줄 것이 없다.
    if (latestRev < 1) notFound();
    const source = await loadSourceDoc(key);
    if (!source) notFound();
    fromDoc = latest.doc;
    toDoc = source;
    fromRev = latestRev;
  } else {
    const to = parseRevParam(sp.to) ?? latestRev;
    const from = parseRevParam(sp.from) ?? to - 1;
    if (from < 1 || from >= to || to > latestRev) notFound();
    const [fromRevision, toRevision] = await Promise.all([getRevision(key, from), getRevision(key, to)]);
    if (!fromRevision || !toRevision) notFound();
    fromDoc = fromRevision.doc;
    toDoc = toRevision.doc;
    fromRev = from;
    toRev = to;
    toItem = toRevision.item;
  }

  const diffs = diffSteps(fromDoc.steps, toDoc.steps);
  const chips = summaryChips(diffs);
  const [signedIn, usages] = await Promise.all([signedInPromise, usagesPromise]);

  const base = `/guide-wiki/${key}`;
  const title = sourceMode
    ? `버전 ${fromRev} → 지금 저장소 원본에서 바뀐 점`
    : `버전 ${fromRev} → 버전 ${toRev}에서 바뀐 점`;

  // 이전/다음 변경: 바로 앞뒤 버전 한 쌍. 범위 밖이면 숨긴다.
  const prev = !sourceMode && fromRev - 1 >= 1 ? { from: fromRev - 1, to: fromRev } : null;
  const next = !sourceMode && toRev !== null && toRev + 1 <= latestRev ? { from: toRev, to: toRev + 1 } : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="px-6 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-4xl">
          <DocHeader
            backHref={`${base}/history`}
            backLabel="고친 기록으로"
            eyebrow={latest.doc.title}
            title={title}
            usages={usages}
          />

          {toItem && toRev !== null && (
            <div className="mt-6">
              <AuthorCard
                item={toItem}
                span={toRev - fromRev}
                action={
                  toRev !== latestRev ? (
                    <RevertDialog
                      docKey={key}
                      targetRev={toRev}
                      latestRev={latestRev}
                      signedIn={signedIn}
                    />
                  ) : null
                }
              />
            </div>
          )}

          <div className="mb-6 mt-5 flex flex-wrap items-center gap-2">
            {chips.added > 0 && (
              <span className={`${CHIP} bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200`}>
                + 단계 {chips.added}개 추가
              </span>
            )}
            {chips.removed > 0 && (
              <span className={`${CHIP} bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200`}>
                − 단계 {chips.removed}개 삭제
              </span>
            )}
            {chips.edited > 0 && (
              <span className={`${CHIP} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200`}>
                단계 {chips.edited}개 수정
              </span>
            )}
            {chips.moved > 0 && (
              <span className={`${CHIP} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200`}>
                ↕ 단계 {chips.moved}개 이동
              </span>
            )}
            {!chips.changed && (
              <span className="text-[13px] text-zinc-600 dark:text-zinc-400">
                바뀐 내용이 없어요.
              </span>
            )}
            {chips.folded > 0 && (
              <span className="px-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                변경 없는 단계 {chips.folded}개는 접어 뒀어요
              </span>
            )}
          </div>

          <StepDiffView diffs={diffs} />

          {(prev || next) && (
            <nav aria-label="다른 변경 보기" className="mt-7 flex flex-wrap justify-between gap-3">
              {prev ? (
                <Link href={`${base}/diff?from=${prev.from}&to=${prev.to}`} className={NAV_LINK}>
                  <span aria-hidden>← </span>이전 변경 · 버전 {prev.from} → {prev.to}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={`${base}/diff?from=${next.from}&to=${next.to}`} className={NAV_LINK}>
                  다음 변경 · 버전 {next.from} → {next.to}
                  <span aria-hidden> →</span>
                </Link>
              )}
            </nav>
          )}

        </div>
      </div>
    </div>
  );
}
