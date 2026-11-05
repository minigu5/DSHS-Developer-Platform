"use client";

import { useState, useEffect } from "react";
import Link from "@/components/shared/link";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { ANONYMOUS_AUTHOR } from "@/lib/constants";
import { commentAuthorView, type CommentRowView } from "@/lib/comments";
import { cn } from "@/lib/utils";

interface CommentListProps {
  comments: CommentRowView[];
  isMine: (comment: CommentRowView) => boolean;
  onEdit: (comment: CommentRowView) => void;
  onDelete: (comment: CommentRowView) => void;
}

function AuthorBadge() {
  return (
    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      만든 사람
    </span>
  );
}

export function CommentList({ comments, isMine, onEdit, onDelete }: CommentListProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (comments.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        아직 댓글이 없어요. 첫 댓글을 남겨 보세요.
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {comments.map((comment) => {
        const author = commentAuthorView(comment);
        const name =
          author.kind === "user" ? author.name : author.kind === "anonymous-author" ? `${ANONYMOUS_AUTHOR} · 만든 사람` : "알 수 없음";
        const avatar = (
          <Avatar>
            {author.kind === "user" && author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
            <AvatarFallback>{name.substring(0, 1)}</AvatarFallback>
          </Avatar>
        );
        return (
          <li key={comment.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              {author.kind === "user" ? (
                <Link href={`/developers/${author.userId}`} aria-hidden tabIndex={-1}>
                  {avatar}
                </Link>
              ) : (
                avatar
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {author.kind === "user" ? (
                      <Link
                        href={`/developers/${author.userId}`}
                        className="font-medium text-sm text-zinc-900 hover:underline dark:text-white"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-medium text-sm text-zinc-900 dark:text-white">{name}</span>
                    )}
                    {author.kind === "user" && author.isAuthor && <AuthorBadge />}
                    <span className="text-xs text-zinc-500">
                      {mounted ? formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ko,
                      }) : "잠시만 기다려 주세요…"}
                    </span>
                  </div>

                  {isMine(comment) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon-sm" }),
                          "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        )}
                        aria-label="댓글 메뉴"
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(comment)}>
                          <Pencil /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(comment)}
                        >
                          <Trash2 /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
