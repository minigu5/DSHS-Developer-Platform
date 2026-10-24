// 결과 스테퍼의 장 이름 줄 오른쪽 자리 — 조각별 "고치기"·"기록" 링크와 마지막 수정 정보.
// 가이드 위키 편집 기능(docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md §7.5).
//   고치기 /guide-wiki/<key>/edit?from=<지금 가이드 경로>, 기록 /guide-wiki/<key>/history
// meta는 서버(loadGuide)가 미리 읽어 넘긴다 — 이 컴포넌트는 클라이언트 스테퍼 안에서 그려진다.

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { History, Pencil } from "lucide-react";

import type { ChapterMeta } from "@/lib/guide-content";

interface GuideChapterToolsProps {
  fragmentKey: string;
  from: string;
  meta: ChapterMeta | null;
}

const LINK =
  "inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:min-h-8 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white";

export function GuideChapterTools({ fragmentKey, from, meta }: GuideChapterToolsProps) {
  const base = `/guide-wiki/${fragmentKey}`;
  const lastEdit =
    meta?.lastAuthor && meta.lastAt
      ? `${meta.lastAuthor.nickname}님이 ${formatDistanceToNow(new Date(meta.lastAt), { addSuffix: true, locale: ko })} 고침`
      : null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {lastEdit && (
        <span className="mr-1 hidden text-xs text-zinc-500 lg:inline dark:text-zinc-400" suppressHydrationWarning>{lastEdit}</span>
      )}
      <Link href={`${base}/edit?from=${encodeURIComponent(from)}`} className={LINK}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        고치기<span className="sr-only"> (이 장)</span>
      </Link>
      <Link
        href={`${base}/history`}
        className={LINK}
        title={lastEdit ?? undefined}
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        기록<span className="sr-only"> (이 장{meta ? `, 버전 ${meta.latestRev}개` : ""})</span>
      </Link>
    </div>
  );
}
