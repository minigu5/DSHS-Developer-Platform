import Link from "next/link";
import { Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { TYPE_ICONS } from "@/lib/type-icons";

export type HaejwoCardData = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
  created_at: string;
  author: { nickname: string | null; full_name: string | null } | null;
  /** 완료된 요청에 연결된 프로젝트 제목 */
  linked_title?: string | null;
};

/** 해줘 상태 알약 색 — 목록 카드·상세 칩이 공유 */
export const HAEJWO_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "구현 요청 중", cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  in_progress: { label: "개발 중", cls: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  done: { label: "완료", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
};

/**
 * 해줘 카드 — 상태 알약 + 종류(아이콘) + 카테고리 칩, 제목 2줄, 완료면 연결 프로젝트 한 줄, 작성자·시간.
 * 완료된 요청은 점선 테두리로 뒤로 물러난다.
 */
export function HaejwoCard({ idea }: { idea: HaejwoCardData }) {
  const typeName = PROJECT_TYPES.find((t) => t.value === idea.type)?.label ?? idea.type;
  const categoryName = FEATURES.find((f) => f.value === idea.category)?.label ?? idea.category;
  const status = HAEJWO_STATUS[idea.status] ?? HAEJWO_STATUS.open;
  const TypeIcon = TYPE_ICONS[idea.type];
  const authorName = idea.author?.nickname ?? idea.author?.full_name ?? "익명";
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: ko });
  const done = idea.status === "done";

  return (
    <Link
      href={`/haejwo/${idea.id}`}
      className={cn(
        "flex min-h-[172px] flex-col gap-3 rounded-3xl border bg-white p-5 shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-zinc-900",
        done ? "border-dashed border-zinc-300 dark:border-zinc-700" : "border-zinc-200 dark:border-zinc-800",
        "hover:border-zinc-400 dark:hover:border-zinc-600",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold", status.cls)}>
          {status.label}
        </span>
        <span className="inline-flex h-5 items-center gap-1 rounded-full border border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {TypeIcon && <TypeIcon className="h-3 w-3" aria-hidden />}
          {typeName}
        </span>
        <span className="inline-flex h-5 items-center rounded-full border border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {categoryName}
        </span>
      </div>

      <h2 className="line-clamp-2 text-[17px] font-bold leading-snug text-zinc-900 dark:text-white">{idea.title}</h2>

      {done && idea.linked_title && (
        <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-3.5 w-3.5" aria-hidden />
          연결된 프로젝트: {idea.linked_title}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            aria-hidden
          >
            {authorName.charAt(0)}
          </span>
          <span className="font-medium text-zinc-600 dark:text-zinc-400">{authorName}</span>
        </span>
        <span>{timeAgo}</span>
      </div>
    </Link>
  );
}
