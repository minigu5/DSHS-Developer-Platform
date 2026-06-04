"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteTip } from "@/app/(nav)/tips/actions";

export function TipOwnerActions({ tipId, authorId }: { tipId: string; authorId: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setShow(user?.id === authorId));
  }, [authorId]);

  if (!show) return null;

  async function handleDelete() {
    if (!window.confirm("이 팁을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setPending(true);
    const result = await deleteTip(tipId);
    if ("error" in result && result.error) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    toast.success("팁이 삭제되었습니다.");
    router.push("/tips");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/tips/${tipId}/edit`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-full",
        )}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" /> 수정
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30",
        )}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {pending ? "삭제 중..." : "삭제"}
      </button>
    </div>
  );
}
