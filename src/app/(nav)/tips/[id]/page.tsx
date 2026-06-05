export const revalidate = 30;

import { notFound } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { cn, isExternalImage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-600/10" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-end">
          <TipOwnerActions tipId={tip.id} authorId={tip.author_id} />
        </div>

        <article>
          {tip.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {tip.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="h-6 rounded-full border-zinc-200 px-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            {tip.title}
          </h1>
          {tip.summary && (
            <p className="mt-3 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              {tip.summary}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3 border-b border-zinc-100 pb-6 dark:border-zinc-800/50">
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-tr from-blue-100 to-purple-100 dark:border-zinc-800 dark:from-blue-900/40 dark:to-purple-900/40">
              {author?.avatar_url ? (
                <Image
                  src={author.avatar_url}
                  alt={authorName}
                  fill
                  className="object-cover"
                  unoptimized={isExternalImage(author.avatar_url)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                  {authorName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">{authorName}</div>
              <div className="text-xs text-zinc-400">
                {format(new Date(tip.created_at), "yyyy년 M월 d일", { locale: ko })}
              </div>
            </div>
          </div>

          {tip.cover_url && (
            <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
              <Image
                src={tip.cover_url}
                alt={tip.title}
                fill
                className="object-cover"
                unoptimized={isExternalImage(tip.cover_url)}
              />
            </div>
          )}

          <div className={cn("mt-8")}>
            <Markdown>{tip.content}</Markdown>
          </div>

          <div className="mt-10 flex items-center gap-3 border-t border-zinc-100 pt-6 dark:border-zinc-800/50">
            <TipLikeButton tipId={tip.id} initialCount={likeCount} />
            <span className="text-sm text-zinc-400">이 팁이 도움이 됐다면 좋아요를 눌러주세요.</span>
          </div>
        </article>

        <TipComments tipId={tip.id} comments={comments} />
      </main>
    </div>
  );
}
