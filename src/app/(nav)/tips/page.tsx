export const revalidate = 30;

import Link from "next/link";
import { PenLine, Megaphone } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TipCard, type TipCardData } from "@/components/tips/tip-card";

type TipRowJoined = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  tags: string[];
  created_at: string;
  author: TipCardData["author"] | TipCardData["author"][] | null;
  tip_likes: { count: number }[];
  tip_comments: { count: number }[];
};

export const metadata = {
  title: "개발 팁 — DSHS Developer Platform",
};

export default async function TipsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tips")
    .select(
      `id, title, summary, cover_url, tags, created_at,
       author:users!tips_author_id_fkey(nickname, full_name, avatar_url),
       tip_likes(count), tip_comments(count)`,
    )
    .order("created_at", { ascending: false })
    .returns<TipRowJoined[]>();

  const tips: TipCardData[] = (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    summary: t.summary,
    cover_url: t.cover_url,
    tags: t.tags ?? [],
    created_at: t.created_at,
    author: Array.isArray(t.author) ? t.author[0] ?? null : t.author,
    likeCount: t.tip_likes?.[0]?.count ?? 0,
    commentCount: t.tip_comments?.[0]?.count ?? 0,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                개발 팁
              </h1>
              <p className="mt-3 max-w-xl text-base sm:text-lg text-zinc-600 dark:text-zinc-400 break-keep">
                막혔다가 해결한 방법, 써 보니 좋았던 도구를 글로 남기는 곳이에요.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/haejwo"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "rounded-full border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-950/30",
                )}
              >
                <Megaphone className="mr-1.5 h-4 w-4" aria-hidden />
                해줘!
              </Link>
              <Link
                href="/tips/new"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-full bg-blue-600 text-white hover:bg-blue-700",
                )}
              >
                <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">팁 작성</span>
                <span className="sm:hidden">작성</span>
              </Link>
            </div>
          </div>
        </div>

        {tips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-zinc-600 dark:text-zinc-400">아직 작성된 팁이 없어요.</p>
            <Link
              href="/tips/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}
            >
              <PenLine className="mr-1.5 h-4 w-4" aria-hidden /> 첫 팁 작성하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
