"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

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
import { deleteIdea } from "@/lib/haejwo/actions";

export function HaejwoOwnerActions({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await deleteIdea(ideaId);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("아이디어가 삭제되었습니다.");
    router.push("/haejwo");
    router.refresh();
  }

  return (
    <>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={`/haejwo/${ideaId}/edit`}
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
            <DialogTitle className="text-lg">아이디어를 삭제할까요?</DialogTitle>
            <DialogDescription>
              이 아이디어가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
                "flex items-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700",
                pending && "cursor-not-allowed opacity-50",
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
