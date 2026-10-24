"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Globe, Smartphone, Puzzle, Terminal, Package,
  Tablet, Laptop, Monitor,
  MousePointer2, Bot, Zap, Sparkles,
  Server, Cloud, Code2,
  type LucideIcon,
} from "lucide-react";

import { GUIDE_STEPS, visibleSteps, buildSlug, type GuideAnswers } from "@/lib/guide";
import { ChoiceRow } from "@/components/forms/choice-row";

const STEP_OPTION_ICONS: Record<string, Record<string, LucideIcon>> = {
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
      <div className="mb-5 flex h-9 items-center justify-between">
        {order.length > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="-ml-3 inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            이전
          </button>
        ) : (
          <span />
        )}
        <span className="inline-flex h-7 items-center rounded-full bg-purple-100 px-3 text-xs font-semibold text-purple-700 tabular-nums dark:bg-purple-950 dark:text-purple-300">
          {stepNumber}단계
        </span>
      </div>

      <div className="mb-6">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-2xl font-bold tracking-tight text-zinc-900 focus:outline-none dark:text-white sm:text-[28px]"
        >
          {current.title}
        </h2>
        <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">{current.description}</p>
      </div>

      <div key={current.key} className="grid gap-2.5 duration-200 animate-in fade-in">
        {current.options.map((opt) => {
          const reason = current.disabledReason?.(answers, opt.value) ?? null;
          return (
            <ChoiceRow
              key={opt.value}
              tone="guide"
              icon={STEP_OPTION_ICONS[current.key]?.[opt.value]}
              label={opt.label}
              description={opt.desc || undefined}
              selected={false}
              disabled={Boolean(reason)}
              disabledReason={reason}
              onSelect={() => select(opt.value)}
            />
          );
        })}
      </div>
    </div>
  );
}
