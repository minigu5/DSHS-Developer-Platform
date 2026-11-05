"use client";

import type { ReactNode } from "react";
import Link from "@/components/shared/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { CONTENT_KIND_LABELS } from "@/lib/admin/feed-filters";
import { highlightSegments } from "@/lib/admin/profanity";
import type { FeedItem } from "@/lib/admin/today";
import { ANONYMOUS_AUTHOR } from "@/lib/constants";

import { SMALL_BTN } from "./confirm-action";

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {highlightSegments(text).map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded bg-rose-100 px-0.5 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** 글 한 줄 — 종류·작성자(익명 글은 실제 작성자 + '익명으로 올림')·시각·내용(비속어 빨갛게)·버튼 */
export function ContentLine({ item, actions }: { item: FeedItem; actions?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {CONTENT_KIND_LABELS[item.kind]}
          </span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {item.anonymous ? item.realName ?? ANONYMOUS_AUTHOR : item.authorName ?? "알 수 없음"}
          </span>
          {item.anonymous && item.realName && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">익명으로 올림</span>
          )}
          <time dateTime={item.createdAt}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}</time>
        </p>
        {item.title && (
          <p className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Highlighted text={item.title} />
          </p>
        )}
        {item.body && (
          <p className="mt-0.5 line-clamp-2 text-sm break-words text-zinc-600 dark:text-zinc-400">
            <Highlighted text={item.body} />
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {actions}
        <Link href={item.href} className={SMALL_BTN}>
          원래 페이지
        </Link>
      </div>
    </div>
  );
}
