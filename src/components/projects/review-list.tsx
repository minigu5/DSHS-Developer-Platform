"use client";

import { useState, useEffect } from "react";
import { Star, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReviewItem {
  id: string;
  rating: number | null;
  comment: string;
  created_at: string;
  user_id: string;
  user: {
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReviewListProps {
  reviews: ReviewItem[];
  currentUserId: string | null;
  onEdit: (review: ReviewItem) => void;
  onDelete: (review: ReviewItem) => void;
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-4 h-4",
            n <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-300 dark:text-zinc-600",
          )}
        />
      ))}
    </div>
  );
}

export function ReviewList({
  reviews,
  currentUserId,
  onEdit,
  onDelete,
}: ReviewListProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reviews.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요.
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {reviews.map((review) => {
        const name = review.user?.nickname || review.user?.full_name || "알 수 없음";
        const isMine = currentUserId === review.user_id;
        return (
          <li key={review.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <Avatar>
                {review.user?.avatar_url && (
                  <AvatarImage src={review.user.avatar_url} alt={name} />
                )}
                <AvatarFallback>{name.substring(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-zinc-900 dark:text-white">
                      {name}
                    </span>
                    <StarDisplay rating={review.rating} />
                    <span className="text-xs text-zinc-500">
                      {mounted ? formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: ko,
                      }) : "잠시만 기다려주세요…"}
                    </span>
                  </div>

                  {isMine && (
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon-sm" }),
                          "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        )}
                        aria-label="리뷰 메뉴"
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(review)}>
                          <Pencil /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(review)}
                        >
                          <Trash2 /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {review.comment}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
