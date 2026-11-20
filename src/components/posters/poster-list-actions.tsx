"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deletePoster } from "@/lib/posters/actions";

/** 글 삭제처럼 이름 입력 없이, 한 번 더 눌러 확인한다. 카드가 좁아 걸기 버튼 옆에 아이콘만 둔다 */
export function DeletePosterButton({ posterId, onDeleted }: { posterId: string; onDeleted: () => void }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking) {
    return (
      <Button
        variant="ghost"
        aria-label="포스터 지우기"
        title="지우기"
        className="h-7 w-7 shrink-0 rounded-full p-0 text-zinc-600 dark:text-zinc-400"
        onClick={() => setAsking(true)}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </Button>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-end">
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
