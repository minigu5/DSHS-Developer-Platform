"use client";

// 프로젝트 상세에서 주인에게만 보이는 포스터 만들기 안내(DomainNudge 와 같은 모양). 보일지는 상세 데이터가 정한다
// (posterNudgeVisible — 주인·공개·걸린 포스터 없음·다른 안내 없음). "×"는 이 브라우저에서 그 프로젝트만 다시 안 띄운다.

import { useState, useSyncExternalStore } from "react";
import Link from "@/components/shared/link";
import { ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

const keyOf = (projectId: string) => `poster-nudge-dismissed:${projectId}`;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function PosterNudge({ projectId }: { projectId: string }) {
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
      aria-labelledby="poster-nudge-title"
      className="relative mt-8 rounded-3xl border border-zinc-200 bg-white p-5 duration-200 animate-in fade-in motion-reduce:animate-none sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="포스터 만들기 안내 닫기"
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <p className="pr-8 text-sm text-zinc-500 dark:text-zinc-400">나에게만 보이는 안내예요</p>
      <h2 id="poster-nudge-title" className="font-heading mt-1 pr-8 text-lg font-bold tracking-tight break-keep text-zinc-900 dark:text-white">
        학교 게시판에 붙일 포스터를 만들어 볼까요?
      </h2>
      <p className="mt-2 text-sm text-zinc-700 break-keep dark:text-zinc-300">
        AI로 만들거나 직접 만든 그림을 올리면 이 페이지에도 걸려요.
      </p>

      <Link
        href={`/projects/${projectId}/poster`}
        className={cn("mt-5 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold transition-colors", SECTION_COLORS.new.button)}
      >
        포스터 만들기
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
