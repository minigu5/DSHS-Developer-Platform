"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

const schema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "댓글을 입력해 주세요")
    .max(500, "500자 이내로 입력해 주세요"),
});

type CommentFormValues = z.infer<typeof schema>;

interface CommentFormProps {
  defaultValue?: string;
  submitLabel: string;
  /** true 를 돌려주면 칸을 비운다(새 댓글) */
  onSubmit: (content: string) => Promise<boolean>;
  onCancel?: () => void;
  /** 같은 화면에 폼이 둘(작성·수정 창)이라 id 를 나눈다 */
  id?: string;
}

export function CommentForm({ defaultValue, submitLabel, onSubmit, onCancel, id = "comment-content" }: CommentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { content: defaultValue ?? "" },
  });

  return (
    <form
      onSubmit={handleSubmit(async ({ content }) => {
        if (await onSubmit(content)) reset({ content: "" });
      })}
      className="space-y-3"
    >
      <div>
        <Label htmlFor={id} className="sr-only">
          댓글 내용
        </Label>
        <Textarea
          id={id}
          {...register("content")}
          rows={3}
          placeholder="써 본 느낌이나 궁금한 점을 남겨 주세요"
          className="min-h-[84px] resize-none rounded-2xl"
        />
        {errors.content && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.content.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="h-9 rounded-full" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className={cn("h-9 rounded-full px-4", SECTION_COLORS.explore.button)}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
