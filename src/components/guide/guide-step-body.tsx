"use client";

// 가이드 단계 본문 렌더러. 결과 스테퍼와 위키 편집기 미리보기(guide-wiki)가 함께 쓴다.
// 서버 전용 import 금지 — 클라이언트 컴포넌트에서도 그대로 쓸 수 있어야 한다.

import { useState } from "react";
import { Check, ChevronRight, Copy, TriangleAlert } from "lucide-react";

import { Markdown } from "@/components/shared/markdown";
import { cn } from "@/lib/utils";
import type { GuideAnswers } from "@/lib/guide";
import {
  matchesCondition,
  resolveGuideLinks,
  splitSegments,
  stripTitle,
  type StepSegment,
} from "@/lib/guide-markup";

export { parseStepMeta } from "@/lib/guide-markup";

interface GuideStepBodyProps {
  body: string;
  /** 지금 고른 답. 없으면(편집기 미리보기) 조건 블록을 모두 라벨과 함께 보여 준다 */
  answers?: GuideAnswers;
  /** "○○에게 이렇게 말해요"의 ○○ */
  aiLabel?: string;
  /** 첫 제목 줄을 빼고 그린다(뷰어가 제목을 따로 그릴 때) */
  hideTitle?: boolean;
}

// 상자 안 Markdown의 글자색·간격이 상자 색을 덮지 않게
const BOX_PROSE = "[&_p]:mb-0 [&_p]:text-inherit [&_p+p]:mt-2 [&_ul]:mb-0 [&_ol]:mb-0 [&_li]:text-inherit [&_pre]:mt-2 [&_pre]:mb-0";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드를 못 쓰는 환경 — 사용자가 직접 복사한다
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="요청 문장 복사"
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? "복사했어요" : "복사"}</span>
    </button>
  );
}

function Segments({ text, answers, aiLabel }: { text: string; answers?: GuideAnswers; aiLabel?: string }) {
  return (
    <>
      {splitSegments(text).map((seg, i) => (
        <Segment key={i} seg={seg} answers={answers} aiLabel={aiLabel} />
      ))}
    </>
  );
}

function Segment({ seg, answers, aiLabel }: { seg: StepSegment; answers?: GuideAnswers; aiLabel?: string }) {
  if (seg.kind === "md") {
    return <Markdown>{resolveGuideLinks(seg.text, answers)}</Markdown>;
  }

  const inner = <Segments text={seg.text} answers={answers} aiLabel={aiLabel} />;

  switch (seg.kind) {
    case "say":
      return (
        <div className="mb-4 rounded-[14px] border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">
              {aiLabel ?? "AI"}에게 이렇게 말해요
            </span>
            <CopyButton text={seg.text} />
          </div>
          <div className={cn(BOX_PROSE, "[&_p]:text-zinc-900 dark:[&_p]:text-zinc-100")}>{inner}</div>
        </div>
      );
    case "ok":
      return (
        <div className="mb-4 flex gap-2.5 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-[15px] leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="mb-1 font-semibold">{seg.label || "됐다는 신호"}</p>
            <div className={BOX_PROSE}>{inner}</div>
          </div>
        </div>
      );
    case "warn":
      return (
        <div className="mb-4 flex gap-2.5 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-[15px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          <div className={cn("min-w-0", "[&_a]:text-amber-900 dark:[&_a]:text-amber-100")}>
            <p className="mb-1 font-semibold">{seg.label || "주의"}</p>
            <div className={BOX_PROSE}>{inner}</div>
          </div>
        </div>
      );
    case "more":
      return (
        <details className="group mb-4 rounded-[14px] border border-zinc-200 dark:border-zinc-800">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-[14px] px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
            {seg.label || "더 보기"}
          </summary>
          <div className="px-4 pb-1">{inner}</div>
        </details>
      );
    case "only":
      if (answers) return matchesCondition(seg.label, answers) ? inner : null;
      return (
        <div className="mb-4 rounded-[14px] border border-dashed border-zinc-300 px-4 pt-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">조건: {seg.label}</p>
          {inner}
        </div>
      );
  }
}

export function GuideStepBody({ body, answers, aiLabel, hideTitle = false }: GuideStepBodyProps) {
  return (
    <div className="[&>:last-child]:mb-0">
      <Segments text={hideTitle ? stripTitle(body) : body} answers={answers} aiLabel={aiLabel} />
    </div>
  );
}
