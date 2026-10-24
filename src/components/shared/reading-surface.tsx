import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 긴 글(마크다운 본문)을 올리는 카드. 다크에서 바탕(zinc-950)보다 한 단계 밝은 zinc-900 면 위에 글이 놓여
 * 눈부심이 줄어든다(2026-10-24 "눈 아프다" 피드백). 라이트에서는 흰 카드 + 선.
 * footer 는 본문 아래 구분선 밑에 들어간다(좋아요 버튼 등).
 */
export function ReadingSurface({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9",
        className,
      )}
    >
      {children}
      {footer && <div className="mt-7 border-t border-zinc-100 pt-5 dark:border-zinc-800">{footer}</div>}
    </div>
  );
}
