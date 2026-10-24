"use client";

import { Columns2, Eye, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

export type EditorTab = "write" | "split" | "preview";

/** 에디터의 큰 제목 입력 — 테두리 없이 밑줄만, Plex 제목 글꼴. 팁·공지·해줘 에디터가 공유 */
export const TITLE_INPUT_CLASS =
  "h-auto w-full rounded-none border-0 border-b border-zinc-200 bg-transparent px-0 py-2 font-heading text-[22px] font-bold tracking-tight text-zinc-900 shadow-none placeholder:font-medium placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-0 sm:text-[26px] dark:border-zinc-800 dark:text-white dark:focus-visible:border-white";

const TABS: Array<{ value: EditorTab; label: string; icon: typeof Pencil; splitOnly?: boolean }> = [
  { value: "write", label: "작성", icon: Pencil },
  { value: "split", label: "분할", icon: Columns2, splitOnly: true },
  { value: "preview", label: "미리보기", icon: Eye },
];

/**
 * 마크다운 에디터 탭(작성 / 분할 / 미리보기) — 세그먼트형. 분할은 데스크탑에서만 보인다(`showSplit`).
 * 팁·공지·프로젝트 등록·해줘 에디터가 공유한다.
 */
export function EditorTabs({
  value,
  onChange,
  showSplit = true,
}: {
  value: EditorTab;
  onChange: (tab: EditorTab) => void;
  showSplit?: boolean;
}) {
  return (
    <div role="tablist" aria-label="편집 모드" className="inline-flex gap-0.5 rounded-[10px] bg-zinc-100 p-[3px] dark:bg-zinc-800">
      {TABS.filter((t) => !t.splitOnly || showSplit).map(({ value: tab, label, icon: Icon, splitOnly }) => {
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
              splitOnly && "hidden md:inline-flex",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
