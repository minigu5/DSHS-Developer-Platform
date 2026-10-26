import Link from "next/link";
import { ChevronRight, Globe, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_COLORS } from "@/lib/section-colors";
import type { DomainShowcase } from "@/lib/domains/read";

const STEPS = [
  { title: "이름 정하기", body: "원하는 이름을 먼저 차지해요. 선착순이에요." },
  { title: "확인 코드 넣기", body: "AI에게 글을 보내 내 사이트에 확인 코드를 넣어요." },
  { title: "호스트에 연결", body: "Vercel·Netlify·GitHub Pages·Render 설정에 주소를 넣어요." },
] as const;

// 이보다 적으면 "벌써 N개"가 오히려 휑해 보여서 숨긴다
const SHOWCASE_MIN = 3;
// 모바일에서는 이만큼만 보여 준다
const SHOWCASE_MOBILE = 3;

/** 홈 "도메인 마련하기" 소개 — 웹사이트를 올린 학생에게 `<이름>.dshs.dev` 주소를 받을 수 있다고 알린다. */
export function DomainTeaser({ showcase }: { showcase?: DomainShowcase | null }) {
  const shown = showcase && showcase.total >= SHOWCASE_MIN && showcase.items.length > 0 ? showcase : null;
  const moreOnMobile = shown ? shown.total - Math.min(SHOWCASE_MOBILE, shown.items.length) : 0;
  const moreOnDesktop = shown ? shown.total - shown.items.length : 0;

  return (
    <div className="reveal grid gap-6 rounded-3xl border border-zinc-200 bg-white p-6 sm:grid-cols-2 sm:items-center sm:gap-8 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <span className={cn("grid h-11 w-11 place-items-center rounded-[13px]", SECTION_COLORS.domains.tile)} aria-hidden>
          <Globe className="h-[22px] w-[22px]" />
        </span>
        <h3 className="font-heading mt-4 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white break-keep">
          웹사이트를 올렸다면, 짧은 주소도 무료로 받아요
        </h3>
        <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-zinc-600 sm:text-[15px] dark:text-zinc-400 break-keep">
          길고 복잡한 호스트 주소 대신 <span className="font-medium text-zinc-900 dark:text-white">내이름.dshs.dev</span>로 사이트를 열 수 있어요. 이 사이트에 등록한 웹사이트 프로젝트라면 누구나, 계정당 3개까지 받을 수 있어요.
        </p>
        <Link
          href="/domains"
          prefetch={true}
          className={cn(
            buttonVariants(),
            "mt-5 h-11 rounded-full px-6 active:scale-[0.96] transition-[background-color,scale]",
            SECTION_COLORS.domains.button,
          )}
        >
          도메인 마련하기
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {/* 주소창 모양 — 받은 주소가 어떻게 보이는지 */}
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
          <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
          <p className="truncate text-[15px] text-zinc-500 dark:text-zinc-400">
            <span className="sr-only">예시 주소: </span>
            https://<span className={cn("font-semibold", SECTION_COLORS.domains.text)}>omm</span>
            <span className="font-medium text-zinc-900 dark:text-white">.dshs.dev</span>
          </p>
        </div>
        <ol className="mt-4 grid gap-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span
                className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", SECTION_COLORS.domains.chip)}
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">{s.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 break-keep">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {shown && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:gap-5 dark:border-zinc-800">
          <p className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400 break-keep">
            벌써 <span className={cn("font-semibold tabular-nums", SECTION_COLORS.domains.text)}>{shown.total}개</span> 사이트가 무료 주소로 열려요
          </p>
          <ul aria-label="연결된 주소" className="flex min-w-0 flex-wrap items-center gap-2">
            {shown.items.map((item, i) => (
              <li key={item.name} className={i >= SHOWCASE_MOBILE ? "hidden sm:block" : undefined}>
                <Link
                  href={`/projects/${item.projectId}`}
                  title={`${item.title} 보기`}
                  className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {item.name}.dshs.dev
                </Link>
              </li>
            ))}
            {moreOnMobile > 0 && <li className="px-1 text-xs text-zinc-500 sm:hidden dark:text-zinc-400">외 {moreOnMobile}개</li>}
            {moreOnDesktop > 0 && <li className="hidden px-1 text-xs text-zinc-500 sm:block dark:text-zinc-400">외 {moreOnDesktop}개</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
