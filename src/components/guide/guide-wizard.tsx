"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Check, Lock,
  Globe, Smartphone, Puzzle, Terminal, Package,
  Tablet, Laptop, Monitor,
  MousePointer2, Bot, Zap, Sparkles,
  Server, Cloud, Code2,
} from "lucide-react";

import { GUIDE_STEPS, visibleSteps, buildSlug, type GuideAnswers } from "@/lib/guide";
import { cn } from "@/lib/utils";

const STEP_OPTION_ICONS: Record<string, Record<string, React.ElementType>> = {
  type: {
    website: Globe,
    app: Smartphone,
    extension: Puzzle,
    cli: Terminal,
    library: Package,
  },
  appPlatform: {
    android: Smartphone,
    ios: Smartphone,
    ipados: Tablet,
    macos: Laptop,
    windows: Monitor,
  },
  terminal: {
    terminal: Terminal,
    gui: MousePointer2,
  },
  ai: {
    'chatgpt-codex': Bot,
    'claude-code': Zap,
    gemini: Sparkles,
  },
  androidGeminiTool: {
    aistudio: Cloud,
    antigravity: Code2,
  },
  os: {
    windows: Monitor,
    mac: Laptop,
    linux: Server,
  },
};

type GuideWizardProps = {
  /** 홈 가이드 미리보기 등에서 1단계(프로그램 종류)를 미리 골라 들어올 때 */
  initialType?: string;
};

export function GuideWizard({ initialType }: GuideWizardProps = {}) {
  const router = useRouter();
  const typeStep = GUIDE_STEPS[0];
  const hasInitialType = !!initialType && typeStep.options.some((o) => o.value === initialType);
  const [answers, setAnswers] = useState<GuideAnswers>(hasInitialType ? { [typeStep.key]: initialType! } : {});
  // 답한 순서를 스택으로 추적해 '이전'으로 정확히 되돌린다.
  const [order, setOrder] = useState<string[]>(hasInitialType ? [typeStep.key] : []);

  const steps = visibleSteps(answers);
  const current = steps.find((s) => !(s.key in answers)) ?? null;
  const stepNumber = order.length + 1;

  // 단계가 바뀌면 새 질문 제목으로 포커스를 옮겨 스크린리더·키보드 사용자가 흐름을 놓치지 않게 함
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [current?.key]);

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
    if (order.length === 0) return;
    const last = order[order.length - 1];
    const next = { ...answers };
    delete next[last];
    setAnswers(next);
    setOrder(order.slice(0, -1));
  };

  if (!current) return null;

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          {order.length > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              이전
            </button>
          ) : (
            <span />
          )}
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stepNumber}단계</span>
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white focus:outline-none"
        >
          {current.title}
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{current.description}</p>
      </div>

      <div
        key={current.key}
        className="space-y-3 duration-200 animate-in fade-in"
      >
        {current.options.map((opt) => {
          const reason = current.disabledReason?.(answers, opt.value) ?? null;
          const disabled = Boolean(reason);
          const Icon = STEP_OPTION_ICONS[current.key]?.[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              disabled={disabled}
              aria-disabled={disabled}
              className={cn(
                "group flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-[color,background-color,border-color,scale] duration-150",
                disabled
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40"
                  : "border-zinc-200 bg-white hover:border-blue-300 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    disabled
                      ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                      : "bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50",
                  )}>
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-semibold",
                      disabled
                        ? "text-zinc-500 dark:text-zinc-500"
                        : "text-zinc-900 dark:text-white",
                    )}
                  >
                    {opt.label}
                  </p>
                  {reason ? (
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">{reason}</p>
                  ) : opt.desc ? (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
                  ) : null}
                </div>
              </div>
              <span
                aria-hidden
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
