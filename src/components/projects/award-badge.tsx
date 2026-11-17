// 이벤트 수상 배지 "🏆 이벤트명 · 1위" — 카드·상세 머리 공용(2026-11-17). 서버·브라우저 둘 다에서 쓴다.

import { Trophy } from "lucide-react";

import type { Award, AwardTone } from "@/lib/awards";
import { cn } from "@/lib/utils";

// 흰·어두운 바탕 모두 대비 4.5:1 이상(amber-900/amber-100 등)
const TONE: Record<AwardTone, string> = {
  gold: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  silver: "bg-slate-200 text-slate-800 dark:bg-slate-400/20 dark:text-slate-200",
  bronze: "bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-200",
  plain: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

export function AwardBadge({ award, className }: { award: Award; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold",
        TONE[award.tone],
        className,
      )}
      title={`${award.eventName} ${award.rankLabel}`}
    >
      <Trophy className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">
        {award.eventName} · {award.rankLabel}
      </span>
    </span>
  );
}

export function AwardBadges({ awards, className }: { awards: Award[]; className?: string }) {
  if (awards.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {awards.map((a) => (
        <AwardBadge key={`${a.eventName}:${a.rankLabel}`} award={a} />
      ))}
    </div>
  );
}
