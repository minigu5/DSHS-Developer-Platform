"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Star } from "lucide-react";

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
import { SECTION_COLORS } from "@/lib/section-colors";

import { ReviewForm, type ReviewFormValues } from "./review-form";
import { ReviewList, type ReviewItem } from "./review-list";

interface ProjectReviewsProps {
  projectId: string;
  reviews: ReviewItem[];
}

export function ProjectReviews({ projectId, reviews }: ProjectReviewsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const [editing, setEditing] = useState<ReviewItem | null>(null);

  const myReview = currentUserId
    ? reviews.find((r) => r.user_id === currentUserId) ?? null
    : null;

  async function handleCreate(values: ReviewFormValues) {
    if (!currentUserId) return;
    const { error } = await supabase.from("reviews").insert({
      project_id: projectId,
      user_id: currentUserId,
      rating: values.rating > 0 ? values.rating : null,
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
      .update({ rating: values.rating > 0 ? values.rating : null, comment: values.comment })
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
    <section className="mt-10">
      <h2 className="mb-4 font-heading text-[22px] font-bold text-zinc-900 dark:text-white">
        리뷰
        <span className="ml-1.5 text-base font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{reviews.length}</span>
      </h2>

      {/* 작성 영역 — 카드 한 장 */}
      <div className="mb-3.5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {!currentUserId ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">리뷰를 남기려면 로그인이 필요해요.</p>
            <Link
              href={`/login?next=/projects/${projectId}`}
              className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-full px-4", SECTION_COLORS.explore.button)}
            >
              로그인
            </Link>
          </div>
        ) : myReview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              이미 이 프로젝트에 리뷰를 남겼어요.
            </div>
            <Button variant="outline" size="sm" className="h-9 rounded-full" onClick={() => setEditing(myReview)}>
              내 리뷰 수정
            </Button>
          </div>
        ) : (
          <ReviewForm onSubmit={handleCreate} submitLabel="리뷰 남기기" />
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
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>리뷰 수정</DialogTitle>
            <DialogDescription>별점과 댓글을 수정합니다.</DialogDescription>
          </DialogHeader>
          {editing && (
            <ReviewForm
              defaultValues={{
                rating: editing.rating ?? 0,
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
