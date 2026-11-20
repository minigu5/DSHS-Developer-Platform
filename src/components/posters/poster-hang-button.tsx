"use client";

import { useTransition } from "react";
import { Check, Pin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { hangPoster, unhangPoster } from "@/lib/posters/hang";

/** 포스터 카드 아래 — 상세 페이지에 걸기 / 걸려 있으면 알약 + 내리기. */
export function PosterHangButton({
  posterId,
  projectId,
  hung,
  onChanged,
  label = "상세 페이지에 걸기",
}: {
  posterId: string;
  projectId: string;
  /** 이 포스터가 지금 걸려 있는지 */
  hung: boolean;
  /** 걸기·내리기 뒤 목록을 다시 읽는다 */
  onChanged: () => void;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const run = (job: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      const result = await job();
      if (result.error) toast.error(result.error);
      else {
        toast.success(done);
        onChanged();
      }
    });

  if (!hung) {
    return (
      <Button variant="outline" className="h-7 rounded-full px-2.5 text-xs" disabled={pending} onClick={() => run(() => hangPoster(posterId), "상세 페이지에 걸었어요.")}>
        <Pin className="mr-1 h-3.5 w-3.5" aria-hidden /> {pending ? "거는 중…" : label}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-zinc-900 px-2.5 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
        <Check className="h-3.5 w-3.5" aria-hidden /> 걸려 있어요
      </span>
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
