import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormSectionProps = {
  id: string;
  title: string;
  /** 제목 옆 작은 보조 글("마크다운", "수정 페이지에서만") */
  hint?: string;
  /** 위험 구역 — rose 테두리 + rose 제목 */
  danger?: boolean;
  children: ReactNode;
  className?: string;
};

/** 긴 폼을 나누는 카드 한 장. 제목은 Plex, `id`는 목차 레일·스크롤 이동에 쓴다. */
export function FormSection({ id, title, hint, danger = false, children, className }: FormSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "scroll-mt-24 rounded-3xl border bg-white p-5 shadow-sm dark:bg-zinc-900 sm:p-7",
        danger ? "border-rose-300 dark:border-rose-900" : "border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      <h2
        id={`${id}-title`}
        className={cn(
          "mb-5 flex items-baseline gap-2 font-heading text-lg font-bold tracking-tight",
          danger ? "text-rose-700 dark:text-rose-300" : "text-zinc-900 dark:text-white",
        )}
      >
        {title}
        {hint && <span className="font-sans text-xs font-medium text-zinc-500 dark:text-zinc-400">{hint}</span>}
      </h2>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}
