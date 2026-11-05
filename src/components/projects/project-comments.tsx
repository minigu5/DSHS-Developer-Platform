"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/shared/link";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { isMyComment, type CommentRowView } from "@/lib/comments";

import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { BannedNotice } from "@/components/shared/banned-notice";
import { friendlyWriteError } from "@/lib/admin/ban";
import { useMyBan } from "@/lib/admin/use-my-ban";

interface ProjectCommentsProps {
  projectId: string;
  comments: CommentRowView[];
  viewerId: string | null;
  /** 내 프로젝트인지(익명이면 my_project_ids로 판단) — 익명 작성자 댓글이 내 것인지 가린다 */
  viewerOwnsProject: boolean;
}

export function ProjectComments({ projectId, comments, viewerId, viewerOwnsProject }: ProjectCommentsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState<CommentRowView | null>(null);
  const [deleting, setDeleting] = useState<CommentRowView | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const ban = useMyBan();

  async function handleCreate(content: string): Promise<boolean> {
    if (!viewerId) return false;
    const { error } = await supabase.from("project_comments").insert({
      project_id: projectId,
      user_id: viewerId,
      content,
    });
    if (error) {
      toast.error(friendlyWriteError(error.message, ban.until) ?? "댓글을 남기지 못했어요.", { description: error.message });
      return false;
    }
    toast.success("댓글을 남겼어요.");
    router.refresh();
    return true;
  }

  async function handleUpdate(content: string): Promise<boolean> {
    if (!editing) return false;
    const { error } = await supabase.from("project_comments").update({ content }).eq("id", editing.id);
    if (error) {
      toast.error(friendlyWriteError(error.message, ban.until) ?? "댓글을 고치지 못했어요.", { description: error.message });
      return false;
    }
    toast.success("댓글을 고쳤어요.");
    setEditing(null);
    router.refresh();
    return true;
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    const { error } = await supabase.from("project_comments").delete().eq("id", deleting.id);
    setDeletePending(false);
    if (error) {
      toast.error("댓글을 지우지 못했어요.", { description: error.message });
      return;
    }
    toast.success("댓글을 지웠어요.");
    setDeleting(null);
    router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-heading text-[22px] font-bold text-zinc-900 dark:text-white">
        댓글
        <span className="ml-1.5 text-base font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{comments.length}</span>
      </h2>

      <div className="mb-3.5">
        <CommentList
          comments={comments}
          isMine={(c) => isMyComment(c, viewerId, viewerOwnsProject)}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      </div>

      {/* 작성 영역 — 대화처럼 목록 아래에 */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {!viewerId ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">댓글을 남기려면 로그인이 필요해요.</p>
            <Link
              href={`/login?next=/projects/${projectId}`}
              className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-full px-4", SECTION_COLORS.explore.button)}
            >
              로그인
            </Link>
          </div>
        ) : ban.banned ? (
          <BannedNotice until={ban.until} />
        ) : (
          <CommentForm onSubmit={handleCreate} submitLabel="댓글 남기기" />
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>댓글 수정</DialogTitle>
            <DialogDescription>남긴 댓글을 고쳐요.</DialogDescription>
          </DialogHeader>
          {editing && (
            <CommentForm
              id="comment-edit-content"
              defaultValue={editing.content}
              submitLabel="수정 저장"
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !deletePending && setDeleting(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>이 댓글을 지울까요?</DialogTitle>
            <DialogDescription>지운 댓글은 되돌릴 수 없어요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-9 rounded-full" onClick={() => setDeleting(null)} disabled={deletePending}>
              취소
            </Button>
            <Button variant="destructive" className="h-9 rounded-full" onClick={handleDelete} disabled={deletePending}>
              {deletePending ? "지우는 중…" : "지우기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
