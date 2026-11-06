"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createPoster, deletePoster } from "@/lib/posters/actions";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

export function NewPosterButton({ projectId, full }: { projectId: string; full: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        className={cn("h-11 rounded-full px-5", SECTION_COLORS.new.button)}
        disabled={full || pending}
        onClick={() =>
          start(async () => {
            const result = await createPoster(projectId);
            if (result?.error) toast.error(result.error);
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" aria-hidden /> {pending ? "만드는 중…" : "새로 만들기"}
      </Button>
      {full && <p className="text-sm text-zinc-500">포스터는 3개까지예요. 하나를 지우면 새로 만들 수 있어요.</p>}
    </div>
  );
}

/** 글 삭제처럼 이름 입력 없이, 한 번 더 눌러 확인한다 */
export function DeletePosterButton({ posterId }: { posterId: string }) {
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
