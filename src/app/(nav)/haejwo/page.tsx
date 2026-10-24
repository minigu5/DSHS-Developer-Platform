export const revalidate = 30;

import { Suspense } from "react";
import Link from "next/link";
import { Megaphone, PenLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { PageHero } from "@/components/shared/page-hero";
import type { HaejwoCardData } from "@/components/haejwo/haejwo-card";
import { HaejwoStatusTabs } from "@/components/haejwo/haejwo-status-tabs";
import { HaejwoGrid } from "@/components/haejwo/haejwo-grid";

export const metadata = {
  title: "해줘! 아이디어 — DSHS Developer Platform",
};

type IdeaRow = Omit<HaejwoCardData, "linked_title" | "author"> & {
  author: HaejwoCardData["author"] | HaejwoCardData["author"][] | null;
  linked_project: { title: string } | { title: string }[] | null;
};

/**
 * 해줘 목록 — 서버는 전체 목록만 ISR(30초)로 내려주고, 상태 세그먼트(`?status=`)는 클라이언트에서 거른다.
 * searchParams를 서버에서 읽으면 페이지가 동적으로 바뀌어 ISR을 잃기 때문.
 */
export default async function HaejwoPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ideas")
    .select(
      `id, title, type, category, status, created_at,
       author:users!ideas_author_id_fkey(nickname, full_name),
       linked_project:projects(title)`,
    )
    .order("created_at", { ascending: false })
    .returns<IdeaRow[]>();

  const ideas: HaejwoCardData[] = (data ?? []).map((row) => {
    const linked = Array.isArray(row.linked_project) ? row.linked_project[0] ?? null : row.linked_project;
    return {
      ...row,
      author: Array.isArray(row.author) ? row.author[0] ?? null : row.author,
      linked_title: linked?.title ?? null,
    };
  });

  const counts = {
    all: ideas.length,
    open: ideas.filter((i) => i.status !== "done").length,
    done: ideas.filter((i) => i.status === "done").length,
  };

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
        {ideas.length > 0 && (
          <Suspense fallback={null}>
            <HaejwoStatusTabs counts={counts} />
          </Suspense>
        )}
      </PageHero>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <Suspense fallback={null}>
          <HaejwoGrid ideas={ideas} />
        </Suspense>
      </main>
    </div>
  );
}
