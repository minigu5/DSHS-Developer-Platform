"use client";

import { useEffect, useTransition } from "react";
import { Check, Loader2, Pin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { hangPoster, unhangPoster } from "@/lib/posters/hang";
import { cn } from "@/lib/utils";

/**
 * 포스터 카드 아래 — 상세 페이지에 걸기 / 걸려 있으면 알약 + 내리기(고쳤으면 다시 걸기).
 * AI 포스터는 PNG 를 뒤에서 찍어서(hangState, 8~9초) 찍는 동안에도 "걸려 있어요"로 보이고(기다릴 일이 아니라서 — 2026-11-07 사용자 "왜 이렇게 오래")
 * 옆에 작게 "상세 페이지 그림 만드는 중"만 둔다. 그동안 2초마다 목록을 다시 읽고(onChanged), 실패면 다시 걸기를 보인다.
 */
export function PosterHangButton({
  posterId,
  projectId,
  hung,
  stale,
  disabled,
  onChanged,
  label = "상세 페이지에 걸기",
  large = false,
}: {
  posterId: string;
  projectId: string;
  /** 이 포스터가 걸린 상태 — 안 걸렸으면 null */
  hung: "hung" | "rendering" | "failed" | null;
  stale: boolean;
  disabled: boolean;
  /** 걸기·내리기 뒤, 그림을 찍는 동안 2초마다 — 목록을 다시 읽는다 */
  onChanged: () => void;
  label?: string;
  /** 만들기 화면 — 옆 버튼들(h-9)과 같은 크기 */
  large?: boolean;
}) {
  const [pending, start] = useTransition();
  const size = large ? "h-9 px-3 text-sm" : "h-7 px-2.5 text-xs";
  const run = (job: () => Promise<{ error?: string; rendering?: boolean }>, done: string) =>
    start(async () => {
      const result = await job();
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.rendering ? "걸었어요. 상세 페이지에는 10초쯤 뒤에 보여요." : done);
        onChanged();
      }
    });

  useEffect(() => {
    if (hung !== "rendering") return;
    const timer = window.setInterval(onChanged, 2000);
    return () => window.clearInterval(timer);
  }, [hung, onChanged]);

  if (!hung) {
    return (
      <Button
        variant="outline"
        className={cn("rounded-full", size)}
        disabled={disabled || pending}
        title={disabled ? "그림이 다 그려진 뒤에 걸 수 있어요" : undefined}
        onClick={() => run(() => hangPoster(posterId), "상세 페이지에 걸었어요.")}
      >
        <Pin className="mr-1 h-3.5 w-3.5" aria-hidden /> {pending ? "거는 중…" : label}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {(hung === "hung" || hung === "rendering") && (
        <span className={cn("inline-flex items-center gap-1 rounded-full bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900", size)}>
          <Check className="h-3.5 w-3.5" aria-hidden /> 걸려 있어요
        </span>
      )}
      {hung === "rendering" && (
        <span role="status" className={cn("inline-flex items-center gap-1 text-zinc-500", large ? "text-sm" : "text-xs")}>
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> 상세 페이지 그림 만드는 중…
        </span>
      )}
      {hung === "failed" && (
        <span className={cn("inline-flex items-center rounded-full bg-rose-50 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", size)}>
          포스터를 못 찍었어요
        </span>
      )}
      {(stale || hung === "failed") && (
        <Button
          variant="outline"
          className={cn("rounded-full", size)}
          disabled={disabled || pending}
          onClick={() => run(() => hangPoster(posterId), "다시 걸었어요.")}
        >
          {pending ? "거는 중…" : stale ? "걸린 뒤 고쳤어요 · 다시 걸기" : "다시 걸기"}
        </Button>
      )}
      <Button
        variant="ghost"
        className={cn("rounded-full text-zinc-600 dark:text-zinc-400", size)}
        disabled={pending}
        onClick={() => run(() => unhangPoster(projectId), "상세 페이지에서 내렸어요.")}
      >
        내리기
      </Button>
    </div>
  );
}
