export const revalidate = 30;

import { notFound } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { isExternalImage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArticleHeader } from "@/components/shared/article-header";
import { ReadingSurface } from "@/components/shared/reading-surface";
import { Markdown } from "@/components/shared/markdown";
import { TipLikeButton } from "@/components/tips/tip-like-button";
import { TipComments, type TipCommentItem } from "@/components/tips/tip-comments";
import { TipOwnerActions } from "@/components/tips/tip-owner-actions";

type TipDetailRow = {
  id: string;
  author_id: string;
  title: string;
  summary: string | null;
  content: string;
  cover_url: string | null;
  tags: string[];
  created_at: string;
  author:
    | { nickname: string | null; full_name: string | null; avatar_url: string | null }
    | { nickname: string | null; full_name: string | null; avatar_url: string | null }[]
    | null;
  tip_likes: { count: number }[];
};

export default async function TipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [tipResult, commentsResult] = await Promise.all([
    supabase
      .from("tips")
      .select(
        `id, author_id, title, summary, content, cover_url, tags, created_at,
         author:users!tips_author_id_fkey(nickname, full_name, avatar_url),
         tip_likes(count)`,
      )
      .eq("id", id)
      .single<TipDetailRow>(),
    supabase
      .from("tip_comments")
      .select(
        "id, content, created_at, user_id, user:users!tip_comments_user_id_fkey(nickname, full_name, avatar_url)",
      )
      .eq("tip_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const { data: tip, error } = tipResult;
  if (error || !tip) notFound();

  const author = Array.isArray(tip.author) ? tip.author[0] ?? null : tip.author;
  const authorName = author?.nickname || author?.full_name || "알 수 없음";
  const likeCount = tip.tip_likes?.[0]?.count ?? 0;

  const comments: TipCommentItem[] = (commentsResult.data ?? []).map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    user: Array.isArray(c.user) ? c.user[0] ?? null : c.user,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <ArticleHeader
          backHref="/tips"
          backLabel="개발 팁"
          actions={<TipOwnerActions tipId={tip.id} authorId={tip.author_id} />}
          chips={
            tip.tags.length > 0
              ? tip.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="h-6 rounded-full border-zinc-200 px-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                  >
                    {tag}
                  </Badge>
                ))
              : undefined
          }
          title={tip.title}
          lead={tip.summary}
          author={{ id: tip.author_id, name: authorName, avatarUrl: author?.avatar_url ?? null }}
          dateLabel={format(new Date(tip.created_at), "yyyy년 M월 d일", { locale: ko })}
        />

        {tip.cover_url && (
          <div className="relative mt-7 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
            {/* 이미지 끝 색상을 블러 처리해 letterbox 배경으로 사용 */}
            <Image
              src={tip.cover_url}
              alt=""
              fill
              className="scale-110 object-cover blur-2xl"
              unoptimized={isExternalImage(tip.cover_url)}
              aria-hidden
            />
            <Image
              src={tip.cover_url}
              alt={tip.title}
              fill
              sizes="(max-width: 768px) calc(100vw - 3rem), 768px"
              className="object-contain"
              quality={90}
              unoptimized={isExternalImage(tip.cover_url)}
            />
          </div>
        )}

        {/* 본문 카드 — 다크에서 바탕보다 한 단계 밝은 면 */}
        <ReadingSurface
          className="mt-7"
          footer={
            <div className="flex flex-wrap items-center gap-3">
              <TipLikeButton tipId={tip.id} initialCount={likeCount} />
              <span className="text-[13px] text-zinc-500 dark:text-zinc-400">도움이 됐다면 눌러 주세요</span>
            </div>
          }
        >
          <Markdown>{tip.content}</Markdown>
        </ReadingSurface>

        <TipComments tipId={tip.id} comments={comments} />
      </main>
    </div>
  );
}
