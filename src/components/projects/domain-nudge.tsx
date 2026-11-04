"use client";

// 프로젝트 상세에서 소유자에게만 보이는 도메인 마련하기 안내. 보일지는 상세 페이지가 서버에서 판단한다
// (소유자·공개 웹사이트·주소 없음·3개 미만). "괜찮아요"는 이 브라우저에서 그 프로젝트만 다시 안 띄운다.

import { useState, useSyncExternalStore } from "react";
import Link from "@/components/shared/link";
import { ArrowRight, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

const keyOf = (projectId: string) => `domain-nudge-dismissed:${projectId}`;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

type Props = {
  projectId: string;
  hostname: string;
  suggestion: string | null;
  quick: boolean;
};

export function DomainNudge({ projectId, hostname, suggestion, quick }: Props) {
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(keyOf(projectId)) === "1";
      } catch {
        return false;
      }
    },
    // 서버·첫 그림에서는 숨겨 두고, 기록을 읽은 뒤 띄운다(닫았던 사람에게 깜빡이지 않게)
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  if (stored || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(keyOf(projectId), "1");
    } catch {
      // 못 남겨도 이 화면에선 숨긴다
    }
  };

  return (
    <section
      aria-labelledby="domain-nudge-title"
      className="relative mt-8 rounded-3xl border border-zinc-200 bg-white p-5 duration-200 animate-in fade-in motion-reduce:animate-none sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="도메인 마련하기 안내 닫기"
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <p className="pr-8 text-sm text-zinc-500 dark:text-zinc-400">나에게만 보이는 안내예요</p>
      <h2 id="domain-nudge-title" className="font-heading mt-1 pr-8 text-lg font-bold tracking-tight break-keep text-zinc-900 dark:text-white">
        짧은 주소로 바꿔 볼까요?
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="break-all font-mono text-zinc-500 dark:text-zinc-400">{hostname}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
        <span className="sr-only">에서</span>
        <span className="break-all font-mono font-semibold text-zinc-900 dark:text-white">{suggestion ?? "이름"}.dshs.dev</span>
      </p>
      <p className="mt-1 text-sm text-zinc-700 break-keep dark:text-zinc-300">
        {quick ? "호스트에서 할 일이 없어서 2분이면 끝나요." : "호스트 설정에 주소 하나만 넣으면 돼요."}
      </p>

      <Link
        href={`/domains?project=${projectId}`}
        className={cn("mt-5 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold transition-colors", SECTION_COLORS.domains.button)}
      >
        도메인 마련하기
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
