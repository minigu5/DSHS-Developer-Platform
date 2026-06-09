"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  rating: z.number().int().min(0).max(5),
  comment: z
    .string()
    .min(1, "댓글을 입력해주세요")
    .max(500, "500자 이내로 입력해주세요"),
});

export type ReviewFormValues = z.infer<typeof schema>;

interface ReviewFormProps {
  defaultValues?: Partial<ReviewFormValues>;
  submitLabel?: string;
  onSubmit: (values: ReviewFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

export function ReviewForm({
  defaultValues,
  submitLabel = "리뷰 작성",
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rating: defaultValues?.rating ?? 0,
      comment: defaultValues?.comment ?? "",
    },
  });

  const rating = watch("rating");
  const [hover, setHover] = useState(0);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      className="space-y-4"
    >
      <input type="hidden" {...register("rating", { valueAsNumber: true })} />

      <div>
        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          별점 <span className="font-normal text-zinc-400">(선택)</span>
        </Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() =>
                  setValue("rating", rating === n ? 0 : n, { shouldValidate: true })
                }
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-1 -m-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label={`${n}점`}
              >
                <Star
                  className={cn(
                    "w-6 h-6 transition-colors",
                    filled
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-zinc-300 dark:text-zinc-600",
                  )}
                />
              </button>
            );
          })}
          {rating > 0 ? (
            <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
              {rating}점
            </span>
          ) : (
            <span className="ml-2 text-sm text-zinc-400 dark:text-zinc-500">
              선택 안 함
            </span>
          )}
        </div>
      </div>

      <div>
        <Label
          htmlFor="review-comment"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block"
        >
          댓글
        </Label>
        <Textarea
          id="review-comment"
          {...register("comment")}
          rows={4}
          placeholder="이 프로젝트에 대한 의견을 남겨주세요"
          className="resize-none"
        />
        {errors.comment && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.comment.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
