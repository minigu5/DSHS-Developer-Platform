"use client";

// 위저드(/guide) 위에 "읽다 만 가이드"를 띄워 그 단계로 바로 돌아가게 한다.
// 기록은 GuideViewer 가 localStorage 에 남긴다(src/lib/guide-resume.ts).

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronRight, X } from "lucide-react";

import { GUIDE_RESUME_KEY, hasMoreToRead, parseGuideResume } from "@/lib/guide-resume";

// 다른 탭에서 가이드를 넘기면 이 화면도 따라 바뀐다
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(GUIDE_RESUME_KEY);
  } catch {
    return null;
  }
}

// "1분 미만 전" 대신 "방금"
function timeAgo(at: number): string {
  if (Date.now() - at < 60_000) return "방금";
  return formatDistanceToNow(new Date(at), { addSuffix: true, locale: ko });
}

export function GuideResumeCard() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const [dismissed, setDismissed] = useState(false);
  const resume = parseGuideResume(raw);

  if (dismissed || !resume || !hasMoreToRead(resume)) return null;

  const pct = ((resume.step + 1) / resume.total) * 100;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.removeItem(GUIDE_RESUME_KEY);
    } catch {
      // 못 지워도 이 화면에선 숨긴다
    }
  };

  return (
    <section
      aria-labelledby="guide-resume-title"
      className="relative mb-9 rounded-3xl border border-zinc-200 bg-white p-5 duration-200 animate-in fade-in motion-reduce:animate-none sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="이어서 보기 기록 지우기"
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <p className="pr-8 text-sm text-zinc-500 dark:text-zinc-400">
        읽다 만 가이드가 있어요 ·{" "}
        {timeAgo(resume.at)}
      </p>
      <h2
        id="guide-resume-title"
        className="font-heading mt-1 pr-8 text-lg font-bold tracking-tight break-keep text-zinc-900 dark:text-white"
      >
        {resume.title}
      </h2>
      <p className="mt-1 text-sm text-zinc-700 break-keep dark:text-zinc-300">
        <span className="font-semibold tabular-nums text-purple-700 dark:text-purple-300">
          {resume.chapterNo}-{resume.inChapter}
        </span>{" "}
        {resume.chapterName}
        {resume.stepTitle && <> · {resume.stepTitle}</>}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <span
          role="progressbar"
          aria-label="가이드 진행"
          aria-valuemin={1}
          aria-valuemax={resume.total}
          aria-valuenow={resume.step + 1}
          className="block h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <span className="block h-full rounded-full bg-purple-600 dark:bg-purple-500" style={{ width: `${pct}%` }} />
        </span>
        <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
          {resume.step + 1} / {resume.total}
        </span>
      </div>

      <Link
        href={resume.path}
        prefetch={true}
        className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-full bg-purple-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-purple-700"
      >
        이어서 보기
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
