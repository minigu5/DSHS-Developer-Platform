"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createPoster, deletePoster } from "@/lib/posters/actions";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

/** 머리 버튼 줄에 올림 버튼과 나란히 — 꺼진 이유(개수·하루 1개)는 목록의 상태 줄이 보여 준다. 만들면 onCreated 로 스튜디오를 연다 */
export function NewPosterButton({ projectId, disabled, onCreated }: { projectId: string; disabled: boolean; onCreated: (posterId: string) => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className={cn("h-11 rounded-full px-5", SECTION_COLORS.new.button)}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await createPoster(projectId);
          if ('error' in result) toast.error(result.error);
          else onCreated(result.id);
        })
      }
    >
      <Plus className="mr-1 h-4 w-4" aria-hidden /> {pending ? "만드는 중…" : "AI로 새로 만들기"}
    </Button>
  );
}

/** 글 삭제처럼 이름 입력 없이, 한 번 더 눌러 확인한다 */
export function DeletePosterButton({ posterId, onDeleted }: { posterId: string; onDeleted: () => void }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking) {
    return (
      <Button variant="ghost" className="h-7 rounded-full px-2.5 text-xs text-zinc-600 dark:text-zinc-400" onClick={() => setAsking(true)}>
        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden /> 지우기
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        className="h-7 rounded-full px-2.5 text-xs text-rose-700 dark:text-rose-400"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deletePoster(posterId);
            if (result.error) toast.error(result.error);
            else onDeleted();
          })
        }
      >
        {pending ? "지우는 중…" : "정말 지우기"}
      </Button>
      <Button variant="ghost" className="h-7 rounded-full px-2.5 text-xs" onClick={() => setAsking(false)}>
        취소
      </Button>
    </div>
  );
}
