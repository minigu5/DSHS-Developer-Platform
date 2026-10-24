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
      className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-colors duration-150 hover:border-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      {tip.cover_url && (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {/* 이미지 끝 색상을 블러 처리해 letterbox 배경으로 사용 */}
          <Image
            src={tip.cover_url}
            alt=""
            fill
            className="scale-110 object-cover blur-xl"
            unoptimized={isExternalImage(tip.cover_url)}
            aria-hidden
          />
          <Image
            src={tip.cover_url}
            alt={tip.title}
            fill
            className="object-contain"
            unoptimized={isExternalImage(tip.cover_url)}
            quality={90}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col px-5 py-4">
        {tip.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
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

        <h2 className="line-clamp-2 text-[17px] font-bold leading-snug text-zinc-900 dark:text-white">
          {tip.title}
        </h2>
        {tip.summary && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {tip.summary}
          </p>
        )}

        <div className="flex-1 min-h-3" />
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
              {tip.author?.avatar_url ? (
                <Image
                  src={tip.author.avatar_url}
                  alt={authorName}
                  fill
                  className="object-cover"
                  unoptimized={isExternalImage(tip.author.avatar_url)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                  {authorName.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{authorName}</span>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" aria-hidden /> {tip.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" aria-hidden /> {tip.commentCount}
            </span>
            <span>{formatDistanceToNow(new Date(tip.created_at), { addSuffix: true, locale: ko })}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
