"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare, Star } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { ReviewForm, type ReviewFormValues } from "./review-form";
import { ReviewList, type ReviewItem } from "./review-list";

interface ProjectReviewsProps {
  projectId: string;
  currentUserId: string | null;
  reviews: ReviewItem[];
}

export function ProjectReviews({
  projectId,
  currentUserId,
  reviews,
}: ProjectReviewsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState<ReviewItem | null>(null);

  const myReview = currentUserId
    ? reviews.find((r) => r.user_id === currentUserId) ?? null
    : null;

  async function handleCreate(values: ReviewFormValues) {
    if (!currentUserId) return;
    const { error } = await supabase.from("reviews").insert({
      project_id: projectId,
      user_id: currentUserId,
      rating: values.rating,
      comment: values.comment,
    });
    if (error) {
      toast.error("리뷰 작성에 실패했습니다.", { description: error.message });
      return;
    }
    toast.success("리뷰가 작성되었습니다.");
    router.refresh();
  }

  async function handleUpdate(values: ReviewFormValues) {
    if (!editing) return;
    const { error } = await supabase
      .from("reviews")
      .update({ rating: values.rating, comment: values.comment })
      .eq("id", editing.id);
    if (error) {
      toast.error("리뷰 수정에 실패했습니다.", { description: error.message });
      return;
    }
    toast.success("리뷰가 수정되었습니다.");
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(review: ReviewItem) {
    if (!window.confirm("이 리뷰를 삭제할까요?")) return;
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", review.id);
    if (error) {
      toast.error("리뷰 삭제에 실패했습니다.", { description: error.message });
      return;
    }
    toast.success("리뷰가 삭제되었습니다.");
    router.refresh();
  }

  return (
    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
          리뷰
        </h3>
        <span className="text-sm text-zinc-500">({reviews.length})</span>
      </div>

      {/* 작성 영역 */}
      <div className="mb-8">
        {!currentUserId ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              리뷰를 작성하려면 로그인이 필요합니다.
            </p>
            <Link
              href={`/login?next=/projects/${projectId}`}
              className={cn(buttonVariants({ size: "default" }))}
            >
              로그인
            </Link>
          </div>
        ) : myReview ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              이미 이 프로젝트에 리뷰를 작성하셨습니다.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(myReview)}
            >
              내 리뷰 수정
            </Button>
          </div>
        ) : (
          <ReviewForm
            onSubmit={handleCreate}
            submitLabel="리뷰 작성"
          />
        )}
      </div>

      <ReviewList
        reviews={reviews}
        currentUserId={currentUserId}
        onEdit={(review) => setEditing(review)}
        onDelete={handleDelete}
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>리뷰 수정</DialogTitle>
            <DialogDescription>별점과 댓글을 수정합니다.</DialogDescription>
          </DialogHeader>
          {editing && (
            <ReviewForm
              defaultValues={{
                rating: editing.rating,
                comment: editing.comment,
              }}
              submitLabel="수정 저장"
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
