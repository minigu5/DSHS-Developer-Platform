import Link from "next/link";
import { ChevronRight } from "lucide-react";

type SectionHeaderProps = {
  id: string;
  title: string;
  description?: string;
  moreHref?: string;
  moreLabel?: string;
};

/** 홈 섹션 공통 머리 — 제목 + 한 줄 설명, 오른쪽에 "전체 보기" 링크(선택). */
export function SectionHeader({ id, title, description, moreHref, moreLabel = "전체 보기" }: SectionHeaderProps) {
  return (
    <div className="reveal mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="font-heading text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] sm:text-sm text-zinc-600 dark:text-zinc-400 break-keep">{description}</p>
        )}
      </div>
      {moreHref && (
        <Link
          href={moreHref}
          className="inline-flex shrink-0 items-center text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {moreLabel}
          <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
