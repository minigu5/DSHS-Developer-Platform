"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, ArrowRight, Rocket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/shared/markdown";
import type { GuideNextStep } from "@/lib/guide-content";

interface GuideViewerProps {
  steps: string[];
  nextTitle: string | null;
  nextSteps: GuideNextStep[];
}

function isInternal(href: string): boolean {
  return href.startsWith("/");
}

export function GuideViewer({ steps, nextTitle, nextSteps }: GuideViewerProps) {
  const [index, setIndex] = useState(0);
  const total = steps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const hasNext = nextSteps.length > 0;

  const nextRef = useRef<HTMLDivElement>(null);

  // 마지막 단계 도달 시, 다음단계 카드로 부드럽게 스크롤.
  useEffect(() => {
    if (isLast && hasNext && nextRef.current) {
      const t = setTimeout(() => {
        nextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isLast, hasNext]);

  return (
    <div className="w-full">
      {/* 진행 표시 */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= index ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-800",
            )}
          />
        ))}
      </div>
      <p className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400">
        {index + 1} / {total} 단계
      </p>

      {/* 단계 본문 */}
      <div
        key={index}
        className="min-h-[280px] rounded-3xl border border-zinc-200 bg-white/70 p-6 sm:p-8 shadow-sm backdrop-blur-xl duration-300 animate-in fade-in slide-in-from-bottom-4 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <Markdown>{steps[index]}</Markdown>
      </div>

      {/* 이동 버튼 */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          className={cn(
            "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
            isFirst
              ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
          )}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> 이전
        </button>

        {!isLast ? (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            다음 <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ) : !hasNext ? (
          <Link
            href="/guide"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> 다시 선택하기
          </Link>
        ) : (
          <span className="text-sm text-zinc-400">마지막 단계예요</span>
        )}
      </div>

      {/* 다음으로 해볼 것 — 마지막 단계에서만 노출 */}
      {isLast && hasNext && (
        <div
          ref={nextRef}
          className="mt-12 scroll-mt-24 duration-500 animate-in fade-in slide-in-from-bottom-6"
        >
          <div className="mb-5 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {nextTitle ?? "다음으로 해볼 것"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {nextSteps.map((ns, i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all hover:border-blue-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-blue-700"
              >
                {ns.description && (
                  <p className="mb-5 leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {ns.description}
                  </p>
                )}
                {isInternal(ns.href) ? (
                  <Link
                    href={ns.href}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "mt-auto w-fit rounded-full bg-blue-600 text-white hover:bg-blue-700",
                    )}
                  >
                    {ns.label} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                ) : (
                  <a
                    href={ns.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "mt-auto w-fit rounded-full bg-blue-600 text-white hover:bg-blue-700",
                    )}
                  >
                    {ns.label} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/guide"
              className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> 처음부터 다시 선택하기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
