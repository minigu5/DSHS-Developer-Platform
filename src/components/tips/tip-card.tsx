import Link from "next/link";
import Image from "next/image";
import { Heart, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { isExternalImage } from "@/lib/utils";

export type TipCardData = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  tags: string[];
  created_at: string;
  author: { nickname: string | null; full_name: string | null; avatar_url: string | null } | null;
  likeCount: number;
  commentCount: number;
};

export function TipCard({ tip }: { tip: TipCardData }) {
  const authorName = tip.author?.nickname || tip.author?.full_name || "알 수 없음";

  return (
    <Link
      href={`/tips/${tip.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {tip.cover_url && (
        <div className="relative h-40 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={tip.cover_url}
            alt={tip.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized={isExternalImage(tip.cover_url)}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {tip.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tip.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-5 rounded-full border-zinc-200 px-2 text-[10px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <h2 className="line-clamp-2 text-lg font-bold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
          {tip.title}
        </h2>
        {tip.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {tip.summary}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-tr from-blue-100 to-purple-100 dark:border-zinc-800 dark:from-blue-900/40 dark:to-purple-900/40">
              {tip.author?.avatar_url ? (
                <Image
                  src={tip.author.avatar_url}
                  alt={authorName}
                  fill
                  className="object-cover"
                  unoptimized={isExternalImage(tip.author.avatar_url)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  {authorName.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{authorName}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {tip.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {tip.commentCount}
            </span>
            <span>{formatDistanceToNow(new Date(tip.created_at), { addSuffix: true, locale: ko })}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
