"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowLeft, ChevronDown, Layers } from "lucide-react";

export type DocUsage = { label: string; href: string };

interface DocHeaderProps {
  backHref: string;
  backLabel: string;
  /** 제목 위 작은 설명줄. 예: "고치는 중 · 버전 3 기준" */
  eyebrow: string;
  title: string;
  usages: DocUsage[];
  /** 뒤로가기를 가로채야 할 때(편집 중 저장 안 한 내용이 있을 때 등). */
  onBackClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  /** 쓰이는 곳 링크를 새 탭으로 연다(편집 중인 화면을 떠나지 않게). */
  usagesInNewTab?: boolean;
}

/** 가이드 위키 편집·기록·비교 화면이 함께 쓰는 머리. */
export function DocHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  usages,
  onBackClick,
  usagesInNewTab = false,
}: DocHeaderProps) {
  return (
    <header>
      <Link
        href={backHref}
        onClick={onBackClick}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>
      <p className="mt-3 text-[13px] text-zinc-500 dark:text-zinc-400">{eyebrow}</p>
      <h1 className="mt-1.5 font-heading text-2xl font-bold text-zinc-900 sm:text-[28px] dark:text-white">
        {title}
      </h1>
      {usages.length > 1 && (
        <details className="group relative mt-3 inline-block">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 [&::-webkit-details-marker]:hidden sm:min-h-9">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            이 내용은 가이드 {usages.length}곳에 함께 쓰여요
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            {usages.map((u) => (
              <li key={u.href}>
                <Link
                  href={u.href}
                  target={usagesInNewTab ? "_blank" : undefined}
                  rel={usagesInNewTab ? "noreferrer" : undefined}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {u.label}
                  {usagesInNewTab && <span className="sr-only"> (새 탭)</span>}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </header>
  );
}
