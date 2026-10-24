export const revalidate = 30;

import Link from "next/link";
import { PenLine, Megaphone, Newspaper } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { PageHero } from "@/components/shared/page-hero";
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="tips"
        icon={Newspaper}
        title="개발 팁"
        description="막혔다가 해결한 방법, 써 보니 좋았던 도구를 글로 남기는 곳이에요."
        actions={
          <>
            <Link
              href="/tips/new"
              className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-5 text-sm", SECTION_COLORS.tips.button)}
            >
              <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
              팁 작성
            </Link>
            <Link
              href="/haejwo"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-11 rounded-full px-5 text-sm border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-950/30",
              )}
            >
              <Megaphone className="mr-1.5 h-4 w-4" aria-hidden />
              해줘! 둘러보기
            </Link>
          </>
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        {tips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">아직 작성된 팁이 없어요.</p>
            <Link
              href="/tips/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 h-9 rounded-full", SECTION_COLORS.tips.button)}
            >
              <PenLine className="mr-1.5 h-4 w-4" aria-hidden /> 첫 팁 작성하기
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              <b className="font-semibold text-zinc-900 tabular-nums dark:text-white">{tips.length}개</b>의 팁
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
