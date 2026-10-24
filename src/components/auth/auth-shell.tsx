import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** 로그인·온보딩·접근 거부가 공유하는 제목·설명 클래스 */
export const AUTH_TITLE_CLASS =
  "rise mt-[22px] font-heading text-[32px] font-bold leading-[1.15] tracking-tight text-zinc-900 break-keep dark:text-white sm:mt-[30px] sm:text-5xl";
export const AUTH_LEAD_CLASS =
  "rise mt-2.5 text-[15px] leading-relaxed text-zinc-600 break-keep dark:text-zinc-400 sm:mt-3.5 sm:text-[19px]";

export const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

/**
 * 헤더 없는 독립 화면 틀(로그인·온보딩·접근 거부). 모눈 물결이 화면 전체 바탕이고, 가운데 세로 스택.
 * 데스크탑은 620px까지 넓게, 모바일은 400px. mark 는 로고 스티커 또는 rose 방패 타일.
 */
export function AuthShell({ children, mark = "logo" }: { children: ReactNode; mark?: "logo" | "warning" }) {
  return (
    <main className="paper-grid grid min-h-screen place-items-center px-6 py-10 sm:py-[72px]">
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center text-center sm:max-w-[620px]">
        {mark === "logo" ? (
          <span
            className="rise block h-16 w-16 overflow-hidden rounded-[20px] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] sm:h-[84px] sm:w-[84px] sm:rounded-[26px]"
            aria-hidden
          >
            <Image src="/logo.svg" alt="" width={84} height={84} className="block h-full w-full" />
          </span>
        ) : (
          <span
            className="rise flex h-16 w-16 items-center justify-center rounded-[20px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 sm:h-[84px] sm:w-[84px] sm:rounded-[26px]"
            aria-hidden
          >
            <ShieldAlert className="h-[30px] w-[30px] sm:h-10 sm:w-10" />
          </span>
        )}
        {children}
      </div>
    </main>
  );
}

/** 안내 상자 — 방패 아이콘 + 한두 문장 */
export function AuthNote({ children, className, delay = 240 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={cn(
        "rise mt-[18px] flex w-full max-w-[460px] items-start gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left text-[13px] leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:text-sm",
        className,
      )}
      style={riseDelay(delay)}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
