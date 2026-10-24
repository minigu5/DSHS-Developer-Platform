"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn, isExternalImage } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

export interface TipCommentItem {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: { nickname: string | null; full_name: string | null; avatar_url: string | null } | null;
}

interface TipCommentsProps {
  tipId: string;
  comments: TipCommentItem[];
}

export function TipComments({ tipId, comments }: TipCommentsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  async function submit() {
    if (!userId || !text.trim() || pending) return;
    setPending(true);
    const { error } = await supabase
      .from("tip_comments")
      .insert({ tip_id: tipId, user_id: userId, content: text.trim() });
    setPending(false);
    if (error) {
      toast.error("댓글 작성에 실패했습니다.", { description: error.message });
      return;
    }
    setText("");
    toast.success("댓글이 작성되었습니다.");
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("tip_comments").delete().eq("id", deleteTarget);
    setDeleteLoading(false);
    if (error) {
      toast.error("댓글 삭제에 실패했습니다.", { description: error.message });
      return;
    }
    setDeleteTarget(null);
    toast.success("댓글이 삭제되었습니다.");
    router.refresh();
  }

  return (
    <>
    <section className="mt-9">
      <h2 className="mb-4 font-heading text-xl font-bold text-zinc-900 dark:text-white">
        댓글
        <span className="ml-1.5 text-base font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{comments.length}</span>
      </h2>

      {/* 작성 */}
      {userId ? (
        <div className="mb-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="이 팁에 대한 생각을 남겨보세요."
            rows={3}
            className="w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !text.trim()}
              className={cn("h-9 rounded-full px-4", SECTION_COLORS.tips.button)}
            >
              {pending ? "작성 중…" : "댓글 작성"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            댓글을 작성하려면 로그인이 필요합니다.
          </p>
          <Link href={`/login?next=/tips/${tipId}`} className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-full", SECTION_COLORS.tips.button)}>
            로그인
          </Link>
        </div>
      )}

      {/* 목록 */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {comments.map((c) => {
            const name = c.user?.nickname || c.user?.full_name || "알 수 없음";
            return (
              <li key={c.id} className="flex gap-3 py-4 first:pt-0">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                  {c.user?.avatar_url ? (
                    <Image
                      src={c.user.avatar_url}
                      alt={name}
                      fill
                      className="object-cover"
                      unoptimized={isExternalImage(c.user.avatar_url)}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200">
                      {name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{name}</span>
                    <span className="text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                    </span>
                    {userId === c.user_id && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c.id)}
                        className="ml-auto text-zinc-400 transition-colors hover:text-rose-500"
                        aria-label="댓글 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {c.content}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">댓글을 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              삭제한 댓글은 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleteLoading}
              className={cn(
                buttonVariants(),
                "rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center",
                deleteLoading && "opacity-50 cursor-not-allowed",
              )}
            >
              {deleteLoading ? (
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
