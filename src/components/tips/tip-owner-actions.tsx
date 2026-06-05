"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTip } from "@/lib/tips/actions";

export function TipOwnerActions({ tipId, authorId }: { tipId: string; authorId: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setShow(user?.id === authorId));
  }, [authorId]);

  if (!show) return null;

  async function handleDelete() {
    setPending(true);
    const result = await deleteTip(tipId);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("팁이 삭제되었습니다.");
    router.push("/tips");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/tips/${tipId}/edit`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> 수정
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30",
          )}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 삭제
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">정말 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              이 팁과 모든 관련 데이터(좋아요, 댓글)가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className={cn(
                buttonVariants(),
                "rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 flex items-center",
                pending && "opacity-50 cursor-not-allowed",
              )}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              삭제하기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
