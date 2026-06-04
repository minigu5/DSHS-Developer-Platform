"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Lock } from "lucide-react";

import { visibleSteps, buildSlug, type GuideAnswers } from "@/lib/guide";
import { cn } from "@/lib/utils";

export function GuideWizard() {
  const router = useRouter();
  const [answers, setAnswers] = useState<GuideAnswers>({});
  // 답한 순서를 스택으로 추적해 '이전'으로 정확히 되돌린다.
  const [order, setOrder] = useState<string[]>([]);

  const steps = visibleSteps(answers);
  const current = steps.find((s) => !(s.key in answers)) ?? null;
  const stepNumber = order.length + 1;

  const select = (value: string) => {
    if (!current) return;
    if (current.disabledReason?.(answers, value)) return;

    const next: GuideAnswers = { ...answers, [current.key]: value };
    const nextSteps = visibleSteps(next);
    const allAnswered = nextSteps.every((s) => s.key in next);

    if (allAnswered) {
      router.push(`/guide/${buildSlug(next)}`);
      return;
    }
    setAnswers(next);
    setOrder([...order, current.key]);
  };

  const goBack = () => {
    if (order.length === 0) {
      router.push("/");
      return;
    }
    const last = order[order.length - 1];
    const next = { ...answers };
    delete next[last];
    setAnswers(next);
    setOrder(order.slice(0, -1));
  };

  if (!current) return null;

  return (
    <div className="w-full max-w-xl">
      {/* 상단 고정 영역: 이전 버튼 + 단계 표시 (진행바 자리) */}
      <div className="mb-8 flex h-10 items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {order.length === 0 ? "나가기" : "이전"}
        </button>
        <span className="text-sm font-medium text-zinc-400">{stepNumber}단계</span>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {current.title}
        </h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{current.description}</p>
      </div>

      <div
        key={current.key}
        className="space-y-3 duration-300 animate-in fade-in slide-in-from-bottom-4"
      >
        {current.options.map((opt) => {
          const reason = current.disabledReason?.(answers, opt.value) ?? null;
          const disabled = Boolean(reason);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              disabled={disabled}
              aria-disabled={disabled}
              className={cn(
                "group flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                disabled
                  ? "cursor-not-allowed border-zinc-200/60 bg-zinc-100/50 opacity-70 dark:border-zinc-800/60 dark:bg-zinc-900/30"
                  : "border-zinc-200 bg-white/70 hover:scale-[1.01] hover:border-blue-300 hover:shadow-lg active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-blue-700",
              )}
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-semibold",
                    disabled
                      ? "text-zinc-400 dark:text-zinc-500"
                      : "text-zinc-900 dark:text-white",
                  )}
                >
                  {opt.label}
                </p>
                {reason ? (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{reason}</p>
                ) : opt.desc ? (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  disabled
                    ? "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                    : "border-zinc-300 text-transparent group-hover:border-blue-400 dark:border-zinc-700",
                )}
              >
                {disabled ? <Lock className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
