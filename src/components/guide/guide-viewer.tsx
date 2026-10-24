"use client";

// 가이드 결과 스테퍼: 장 4개의 단계를 한 화면에 하나씩 보여 주고 버튼으로 넘긴다.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuideAnswers } from "@/lib/guide";
import type { LoadedChapter } from "@/lib/guide-content";
import { parseStepMeta, routeOf } from "@/lib/guide-markup";
import { GuideStepBody } from "@/components/guide/guide-step-body";
import { GuideChapterTools } from "@/components/guide/guide-chapter-tools";

interface GuideViewerProps {
  /** 진행 저장 key (가이드 주소) */
  storageKey: string;
  chapters: LoadedChapter[];
  answers: GuideAnswers;
  aiLabel: string;
  /** ai=none 이라 도구를 대신 골랐을 때 1장 첫 단계 위에 보여 줄 문구 */
  recommendedNote: string | null;
}

type FlatStep = {
  chapterIndex: number;
  inChapter: number;
  body: string;
  title: string;
  next: string | null;
  route: string | null;
};

const STORAGE_PREFIX = "guide-progress:";

const noopSubscribe = () => () => {};

/** 저장된 진행 단계. 없거나 범위 밖(위키에서 단계가 줄어든 경우 등)이면 0 */
function readSaved(storageKey: string, total: number): number {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_PREFIX + storageKey));
    return Number.isInteger(saved) && saved > 0 && saved < total ? saved : 0;
  } catch {
    return 0;
  }
}

export function GuideViewer({ storageKey, chapters, answers, aiLabel, recommendedNote }: GuideViewerProps) {
  const pathname = usePathname();

  const steps = useMemo<FlatStep[]>(
    () =>
      chapters.flatMap((c, chapterIndex) =>
        c.steps.map((s, inChapter) => {
          const meta = parseStepMeta(s.body);
          return { chapterIndex, inChapter, body: s.body, title: meta.title ?? "", next: meta.next, route: meta.route };
        }),
      ),
    [chapters],
  );
  const routes = useMemo(() => chapters.map((c) => routeOf(c.steps.map((s) => s.body))), [chapters]);

  const total = steps.length;
  // 처음엔 저장된 진행(서버 렌더에선 0), 버튼을 누른 뒤엔 누른 단계
  const saved = useSyncExternalStore(noopSubscribe, () => readSaved(storageKey, total), () => 0);
  const [picked, setPicked] = useState<number | null>(null);
  const index = picked ?? saved;

  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(total - 1, next));
    moved.current = true;
    setPicked(clamped);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, String(clamped));
    } catch {
      // 저장 실패해도 넘기기는 된다
    }
  };

  // 단계가 바뀌면 새 제목으로 포커스, 카드가 화면 위로 벗어나 있으면 카드 머리로 스크롤
  useEffect(() => {
    if (!moved.current) return;
    headingRef.current?.focus({ preventScroll: true });
    const top = cardRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 80) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cardRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
  }, [index]);

  if (total === 0) return null;

  const step = steps[index];
  const chapter = chapters[step.chapterIndex];
  const chapterLen = chapter.steps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isChapterEnd = step.inChapter === chapterLen - 1;
  const nextLabel = step.next ?? (isChapterEnd && !isLast ? `${chapters[step.chapterIndex + 1].no}장으로` : "다음");
  const route = routes[step.chapterIndex];
  const routeAt = step.route ? route.indexOf(step.route) : -1;

  const firstIndexOf = (chapterIndex: number) => steps.findIndex((s) => s.chapterIndex === chapterIndex);

  return (
    <div>
      {/* 진행 막대: 장 단위 */}
      <nav aria-label="가이드 장" className="grid grid-cols-4 gap-2">
        {chapters.map((c, ci) => {
          const pct =
            ci < step.chapterIndex ? 100 : ci > step.chapterIndex ? 0 : ((step.inChapter + 1) / chapterLen) * 100;
          const current = ci === step.chapterIndex;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => go(firstIndexOf(ci))}
              aria-current={current ? "step" : undefined}
              aria-label={`${c.no}장 ${c.name}`}
              className="group flex min-w-0 flex-col gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-600"
            >
              <span className="block h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-purple-600 transition-[width] duration-300 motion-reduce:transition-none dark:bg-purple-500"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span
                className={cn(
                  "truncate text-[13px] transition-colors",
                  current
                    ? "font-semibold text-zinc-900 dark:text-white"
                    : "font-medium text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200",
                )}
              >
                {c.no}
                <span className="hidden sm:inline">. {c.name}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* 장 이름 줄 */}
      <div className="mt-7 mb-3 flex min-h-8 items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {chapter.no}장 · {chapter.name}{" "}
          <span className="font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
            — {step.inChapter + 1} / {chapterLen}
          </span>
        </p>
        <GuideChapterTools fragmentKey={chapter.key} from={pathname} meta={chapter.meta} />
      </div>

      {/* 장이 바뀌었을 때 한 줄 */}
      {step.inChapter === 0 && step.chapterIndex > 0 && (
        <p className="mb-3 flex items-center gap-2.5 rounded-[14px] bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {chapters[step.chapterIndex - 1].name} 끝! 이제 {chapter.name} 차례예요.
        </p>
      )}
      {index === 0 && recommendedNote && (
        <p className="mb-3 rounded-[14px] bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:bg-purple-950/50 dark:text-purple-200">
          {recommendedNote}
        </p>
      )}

      {/* 단계 카드 */}
      <div
        ref={cardRef}
        key={index}
        className="scroll-mt-24 rounded-3xl border border-zinc-200 bg-white p-6 duration-200 animate-in fade-in motion-reduce:animate-none sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {route.length > 1 && routeAt >= 0 && (
          <ol aria-label="올리는 순서" className="mb-5 flex flex-wrap items-center gap-1.5">
            {route.map((r, ri) => (
              <li
                key={r}
                aria-current={ri === routeAt ? "step" : undefined}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-3 text-[13px]",
                  ri === routeAt
                    ? "border-purple-600 bg-purple-600 font-semibold text-white"
                    : ri < routeAt
                      ? "border-zinc-400 font-medium text-zinc-900 dark:border-zinc-500 dark:text-zinc-100"
                      : "border-zinc-200 font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
                )}
              >
                {r}
              </li>
            ))}
          </ol>
        )}
        <p className="text-sm font-semibold tabular-nums text-purple-700 dark:text-purple-300">
          {chapter.no}-{step.inChapter + 1}
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-heading mt-1 mb-4 text-2xl font-bold tracking-tight text-zinc-900 break-keep focus:outline-none sm:text-[26px] dark:text-white"
        >
          {step.title}
        </h2>
        <GuideStepBody body={step.body} answers={answers} aiLabel={aiLabel} hideTitle />

        {isLast && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects/new"
              className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700"
            >
              내 프로젝트 등록하기
            </Link>
            <Link
              href="/haejwo"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 px-6 text-[15px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500"
            >
              해줘! 둘러보기
            </Link>
          </div>
        )}
      </div>

      {/* 넘기기 */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={isFirst}
          className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-[15px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:text-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:disabled:text-zinc-700"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          이전
        </button>
        {isLast ? (
          <Link href="/guide" className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}>
            다른 걸 만들어 볼래요
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="inline-flex h-12 items-center gap-1.5 rounded-full bg-purple-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-purple-700"
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
