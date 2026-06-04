export const revalidate = 30;

import Link from "next/link";
import { Lightbulb, PenLine } from "lucide-react";

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
       author:users(nickname, full_name, avatar_url),
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-600/10" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            <Lightbulb className="h-4 w-4" /> 개발 팁
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                친구들의 개발 노하우
              </h1>
              <p className="mt-3 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
                막힐 때 도움이 된 팁, 직접 터득한 노하우를 자유롭게 나눠보세요.
              </p>
            </div>
            <Link
              href="/tips/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-full bg-blue-600 text-white hover:bg-blue-700 shrink-0",
              )}
            >
              <PenLine className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">팁 작성</span>
              <span className="sm:hidden">작성</span>
            </Link>
          </div>
        </div>

        {tips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-zinc-500 dark:text-zinc-400">아직 작성된 팁이 없습니다.</p>
            <Link
              href="/tips/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}
            >
              <PenLine className="mr-1.5 h-4 w-4" /> 첫 팁 작성하기
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
