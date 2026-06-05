export const revalidate = 30;

import Link from "next/link";
import { Megaphone, PenLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";

export const metadata = {
  title: "해줘! 아이디어 — DSHS Developer Platform",
};

type IdeaRow = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
  created_at: string;
  author: { nickname: string | null; full_name: string | null } | null;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: "구현 요청 중", cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  in_progress: { label: "개발 중", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "완료", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export default async function HaejwoPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ideas")
    .select(
      `id, title, type, category, status, created_at,
       author:users!ideas_author_id_fkey(nickname, full_name)`,
    )
    .order("created_at", { ascending: false })
    .returns<IdeaRow[]>();

  const ideas = data ?? [];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-orange-500/10 blur-[120px] dark:bg-orange-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px] dark:bg-amber-600/10" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
            <Megaphone className="h-4 w-4" /> 해줘!
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                아이디어, 개발자에게 맡겨봐요
              </h1>
              <p className="mt-3 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
                만들고 싶은 프로그램이 있지만 직접 만들기 어렵다면? 아이디어를 올리고 개발자를 찾아보세요.
              </p>
            </div>
            <Link
              href="/haejwo/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "shrink-0 rounded-full bg-orange-500 text-white hover:bg-orange-600",
              )}
            >
              <PenLine className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">아이디어 올리기</span>
              <span className="sm:hidden">올리기</span>
            </Link>
          </div>
        </div>

        {ideas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-zinc-500 dark:text-zinc-400">아직 등록된 아이디어가 없습니다.</p>
            <Link
              href="/haejwo/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full bg-orange-500 text-white hover:bg-orange-600")}
            >
              <PenLine className="mr-1.5 h-4 w-4" /> 첫 아이디어 올리기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => {
              const typeName = PROJECT_TYPES.find((t) => t.value === idea.type)?.label ?? idea.type;
              const categoryName = FEATURES.find((f) => f.value === idea.category)?.label ?? idea.category;
              const status = STATUS_LABELS[idea.status] ?? STATUS_LABELS.open;
              const authorName =
                Array.isArray(idea.author)
                  ? (idea.author[0]?.nickname ?? idea.author[0]?.full_name ?? "익명")
                  : (idea.author?.nickname ?? idea.author?.full_name ?? "익명");
              const timeAgo = formatDistanceToNow(new Date(idea.created_at), {
                addSuffix: true,
                locale: ko,
              });

              return (
                <Link
                  key={idea.id}
                  href={`/haejwo/${idea.id}`}
                  className="group flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-orange-700"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {typeName}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {categoryName}
                    </span>
                    <span
                      className={cn(
                        "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        status.cls,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="line-clamp-2 font-semibold leading-snug text-zinc-900 group-hover:text-orange-700 dark:text-white dark:group-hover:text-orange-400">
                    {idea.title}
                  </p>
                  <div className="mt-auto flex items-center gap-2 text-xs text-zinc-400">
                    <span>{authorName}</span>
                    <span>·</span>
                    <span>{timeAgo}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
