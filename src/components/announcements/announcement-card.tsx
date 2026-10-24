import Link from "next/link";
import Image from "next/image";
import { Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { cn, isExternalImage } from "@/lib/utils";
import { announcementCategoryColor, announcementCategoryLabel } from "@/lib/announcement-colors";

export type AnnouncementCardData = {
  id: string;
  title: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  /** 본문 첫 문단 평문(서버에서 `announcementSummary`로 생성) */
  summary: string;
  author: { nickname: string | null; full_name: string | null; avatar_url: string | null } | null;
};

/**
 * 공지 카드 — 카테고리 알약(티커와 같은 색) + 고정 표시, 제목 2줄, 요약 2줄, 작성자·시간.
 * 고정 공지는 배경을 칠하지 않고 테두리만 sky.
 */
export function AnnouncementCard({ announcement }: { announcement: AnnouncementCardData }) {
  const authorName =
    announcement.author?.nickname || announcement.author?.full_name || "알 수 없음";

  return (
    <Link
      href={`/announcements/${announcement.id}`}
      className={cn(
        "group flex min-h-[160px] flex-col gap-3 rounded-3xl border bg-white p-5 shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-zinc-900",
        announcement.is_pinned
          ? "border-sky-300 hover:border-sky-400 dark:border-sky-800 dark:hover:border-sky-700"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold",
            announcementCategoryColor(announcement.category),
          )}
        >
          {announcementCategoryLabel(announcement.category)}
        </span>
        {announcement.is_pinned && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
            <Pin className="h-3 w-3" aria-hidden />
            고정
          </span>
        )}
      </div>

      <h2 className="line-clamp-2 text-[17px] font-bold leading-snug text-zinc-900 dark:text-white">
        {announcement.title}
      </h2>
      {announcement.summary && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {announcement.summary}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
            {announcement.author?.avatar_url ? (
              <Image
                src={announcement.author.avatar_url}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
                unoptimized={isExternalImage(announcement.author.avatar_url)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200" aria-hidden>
                {authorName.charAt(0)}
              </span>
            )}
          </span>
          <span className="font-medium text-zinc-600 dark:text-zinc-400">{authorName}</span>
        </span>
        <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: ko })}</span>
      </div>
    </Link>
  );
}
