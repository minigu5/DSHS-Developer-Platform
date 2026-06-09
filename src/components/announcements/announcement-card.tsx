import Link from "next/link";
import Image from "next/image";
import { Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { isExternalImage } from "@/lib/utils";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

export type AnnouncementCardData = {
  id: string;
  title: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  author: { nickname: string | null; full_name: string | null; avatar_url: string | null } | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  promotion: "border-sky-200 text-sky-600 dark:border-sky-900/50 dark:text-sky-400",
  beta:      "border-violet-200 text-violet-600 dark:border-violet-900/50 dark:text-violet-400",
  feedback:  "border-emerald-200 text-emerald-600 dark:border-emerald-900/50 dark:text-emerald-400",
  update:    "border-amber-200 text-amber-600 dark:border-amber-900/50 dark:text-amber-400",
  general:   "border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

export function AnnouncementCard({ announcement }: { announcement: AnnouncementCardData }) {
  const authorName =
    announcement.author?.nickname || announcement.author?.full_name || "알 수 없음";

  const categoryLabel =
    ANNOUNCEMENT_CATEGORIES.find((c) => c.value === announcement.category)?.label ??
    announcement.category;

  const colorClass = CATEGORY_COLORS[announcement.category] ?? CATEGORY_COLORS.general;

  return (
    <Link
      href={`/announcements/${announcement.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2">
          {announcement.is_pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Pin className="h-2.5 w-2.5" /> 고정됨
            </span>
          )}
          <Badge
            variant="outline"
            className={`h-5 rounded-full px-2 text-[10px] ${colorClass}`}
          >
            {categoryLabel}
          </Badge>
        </div>

        <h2 className="line-clamp-2 flex-1 text-lg font-bold text-zinc-900 transition-colors group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
          {announcement.title}
        </h2>

        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-tr from-sky-100 to-blue-100 dark:border-zinc-800 dark:from-sky-900/40 dark:to-blue-900/40">
              {announcement.author?.avatar_url ? (
                <Image
                  src={announcement.author.avatar_url}
                  alt={authorName}
                  fill
                  className="object-cover"
                  unoptimized={isExternalImage(announcement.author.avatar_url)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-sky-700 dark:text-sky-300">
                  {authorName.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{authorName}</span>
          </div>

          <span className="text-xs text-zinc-400">
            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: ko })}
          </span>
        </div>
      </div>
    </Link>
  );
}
