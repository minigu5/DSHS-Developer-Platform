export const revalidate = 30;

import Link from "next/link";
import { Megaphone, PenLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { PageHero } from "@/components/shared/page-hero";
import { HaejwoCard, type HaejwoCardData } from "@/components/haejwo/haejwo-card";
import { HaejwoStatusTabs, type HaejwoStatusFilter } from "@/components/haejwo/haejwo-status-tabs";

export const metadata = {
  title: "해줘! 아이디어 — DSHS Developer Platform",
};

type IdeaRow = Omit<HaejwoCardData, "linked_title" | "author"> & {
  author: HaejwoCardData["author"] | HaejwoCardData["author"][] | null;
  linked_project: { title: string } | { title: string }[] | null;
};

function parseStatus(value: string | undefined): HaejwoStatusFilter {
  return value === "open" || value === "done" ? value : "all";
}

export default async function HaejwoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const filter = parseStatus(statusParam);
  const supabase = await createClient();

  // 전체를 한 번 가져와 세그먼트 수를 세고, 선택된 상태만 보여준다(목록 규모가 작아 서버 필터 대신 메모리 필터)
  const { data } = await supabase
    .from("ideas")
    .select(
      `id, title, type, category, status, created_at,
       author:users!ideas_author_id_fkey(nickname, full_name),
       linked_project:projects(title)`,
    )
    .order("created_at", { ascending: false })
    .returns<IdeaRow[]>();

  const all: HaejwoCardData[] = (data ?? []).map((row) => {
    const linked = Array.isArray(row.linked_project) ? row.linked_project[0] ?? null : row.linked_project;
    return {
      ...row,
      author: Array.isArray(row.author) ? row.author[0] ?? null : row.author,
      linked_title: linked?.title ?? null,
    };
  });

  const counts = {
    all: all.length,
    open: all.filter((i) => i.status !== "done").length,
    done: all.filter((i) => i.status === "done").length,
  };
  const ideas =
    filter === "all" ? all : filter === "done" ? all.filter((i) => i.status === "done") : all.filter((i) => i.status !== "done");

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="haejwo"
        icon={Megaphone}
        title="해줘!"
        description="있으면 좋겠는 프로그램을 올리면, 만들 수 있는 사람이 가져가요. 개발을 못 해도 괜찮아요."
        actions={
          <Link
            href="/haejwo/new"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-5 text-sm", SECTION_COLORS.haejwo.button)}
          >
            <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
            해줘! 등록
          </Link>
        }
      >
        {all.length > 0 && <HaejwoStatusTabs counts={counts} value={filter} />}
      </PageHero>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        {ideas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">
              {all.length === 0 ? "아직 올라온 아이디어가 없어요." : "이 상태의 아이디어가 없어요."}
            </p>
            {all.length === 0 && (
              <Link
                href="/haejwo/new"
                className={cn(buttonVariants({ size: "sm" }), "mt-4 h-9 rounded-full", SECTION_COLORS.haejwo.button)}
              >
                <PenLine className="mr-1.5 h-4 w-4" aria-hidden /> 첫 아이디어 올리기
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <HaejwoCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
