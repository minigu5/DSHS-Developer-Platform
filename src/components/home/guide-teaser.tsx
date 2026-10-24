import type { CSSProperties } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Globe, Package, Puzzle, Smartphone, Terminal } from "lucide-react";

import { GUIDE_STEPS } from "@/lib/guide";

const TYPE_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  app: Smartphone,
  extension: Puzzle,
  cli: Terminal,
  library: Package,
};

const revealOrder = (n: number) => ({ "--reveal-delay": `${n * 90}ms` }) as CSSProperties;

/** 홈 "직접 만들어 보고 싶다면" — 가이드 위저드 1단계 질문을 그대로 보여 주고, 고르면 `/guide?type=`로 이어진다. */
export function GuideTeaser() {
  const step = GUIDE_STEPS[0];

  return (
    <div className="reveal grid gap-6 rounded-3xl border border-zinc-200 bg-white p-6 sm:grid-cols-2 sm:items-center sm:gap-8 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" aria-hidden>
          <BookOpen className="h-[22px] w-[22px]" />
        </span>
        <h3 className="font-heading mt-4 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">직접 만들어 보고 싶다면</h3>
        <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-zinc-600 sm:text-[15px] dark:text-zinc-400 break-keep">
          코딩을 해 본 적 없어도 괜찮아요. 만들고 싶은 것과 쓰는 컴퓨터를 고르면 설치부터 첫 실행까지 단계별로 알려줘요.
        </p>
        <Link
          href="/guide"
          className="mt-4 inline-flex items-center text-sm font-medium text-purple-700 hover:underline underline-offset-4 dark:text-purple-300 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          가이드 처음부터 보기
          <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">1단계</p>
        <p className="mt-0.5 text-[15px] font-bold text-zinc-900 dark:text-white">{step.title}</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {step.options.map((opt, i) => {
            const Icon = TYPE_ICONS[opt.value] ?? Globe;
            return (
              <li key={opt.value} className="reveal" style={revealOrder(i)}>
                <Link
                  href={`/guide?type=${opt.value}`}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-medium text-zinc-900 transition-colors hover:border-purple-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:border-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" aria-hidden>
                    <Icon className="h-[15px] w-[15px]" />
                  </span>
                  <span className="truncate">{opt.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
