"use client";

import { useEffect, useTransition } from "react";
import { Check, Loader2, Pin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { hangPoster, unhangPoster } from "@/lib/posters/hang";

/**
 * 포스터 카드 아래 — 상세 페이지에 걸기 / 걸려 있으면 알약 + 내리기(고쳤으면 다시 걸기).
 * AI 포스터는 PNG 를 뒤에서 찍어서(hangState) "거는 중"이면 3초마다 목록을 다시 읽고(onChanged), 실패면 다시 걸기를 보인다.
 */
export function PosterHangButton({
  posterId,
  projectId,
  hung,
  stale,
  disabled,
  onChanged,
}: {
  posterId: string;
  projectId: string;
  /** 이 포스터가 걸린 상태 — 안 걸렸으면 null */
  hung: "hung" | "rendering" | "failed" | null;
  stale: boolean;
  disabled: boolean;
  /** 걸기·내리기 뒤, 거는 중일 때 3초마다 — 목록을 다시 읽는다 */
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const run = (job: () => Promise<{ error?: string; rendering?: boolean }>, done: string) =>
    start(async () => {
      const result = await job();
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.rendering ? "걸고 있어요. 포스터를 찍는 데 10초쯤 걸려요." : done);
        onChanged();
      }
    });

  useEffect(() => {
    if (hung !== "rendering") return;
    const timer = window.setInterval(onChanged, 3000);
    return () => window.clearInterval(timer);
  }, [hung, onChanged]);

  if (!hung) {
    return (
      <Button
        variant="outline"
        className="h-7 rounded-full px-2.5 text-xs"
        disabled={disabled || pending}
        title={disabled ? "그림이 다 그려진 뒤에 걸 수 있어요" : undefined}
        onClick={() => run(() => hangPoster(posterId), "상세 페이지에 걸었어요.")}
      >
        <Pin className="mr-1 h-3.5 w-3.5" aria-hidden /> {pending ? "거는 중…" : "상세 페이지에 걸기"}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {hung === "hung" && (
        <span className="inline-flex h-7 items-center gap-1 rounded-full bg-zinc-900 px-2.5 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
          <Check className="h-3.5 w-3.5" aria-hidden /> 걸려 있어요
        </span>
      )}
      {hung === "rendering" && (
        <span role="status" className="inline-flex h-7 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> 거는 중…
        </span>
      )}
      {hung === "failed" && (
        <span className="inline-flex h-7 items-center rounded-full bg-rose-50 px-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          포스터를 못 찍었어요
        </span>
      )}
      {(stale || hung === "failed") && (
        <Button
          variant="outline"
          className="h-7 rounded-full px-2.5 text-xs"
          disabled={disabled || pending}
          onClick={() => run(() => hangPoster(posterId), "다시 걸었어요.")}
        >
          {pending ? "거는 중…" : stale ? "걸린 뒤 고쳤어요 · 다시 걸기" : "다시 걸기"}
        </Button>
      )}
      <Button
        variant="ghost"
        className="h-7 rounded-full px-2.5 text-xs text-zinc-600 dark:text-zinc-400"
        disabled={pending}
        onClick={() => run(() => unhangPoster(projectId), "상세 페이지에서 내렸어요.")}
      >
        내리기
      </Button>
    </div>
  );
}
