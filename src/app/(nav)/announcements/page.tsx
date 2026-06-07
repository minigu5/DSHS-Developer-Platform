export const revalidate = 30;

import Link from "next/link";
import { Bell, PenLine, Pin } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnnouncementCard, type AnnouncementCardData } from "@/components/announcements/announcement-card";

export const metadata = {
  title: "공지사항 — DSHS Developer Platform",
};

type AnnouncementRowJoined = {
  id: string;
  title: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  author: AnnouncementCardData["author"] | AnnouncementCardData["author"][] | null;
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select(
      `id, title, category, is_pinned, created_at,
       author:users!announcements_author_id_fkey(nickname, full_name, avatar_url)`,
    )
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AnnouncementRowJoined[]>();

  const announcements: AnnouncementCardData[] = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    is_pinned: a.is_pinned,
    created_at: a.created_at,
    author: Array.isArray(a.author) ? a.author[0] ?? null : a.author,
  }));

  const pinned = announcements.filter((a) => a.is_pinned);
  const regular = announcements.filter((a) => !a.is_pinned);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
            <Bell className="h-4 w-4" /> 공지사항
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                개발자 공지사항
              </h1>
              <p className="mt-3 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
                프로젝트 홍보, 베타 테스터 모집, 의견 수렴 등을 자유롭게 올려보세요.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/announcements/new"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-full bg-sky-600 text-white hover:bg-sky-700",
                )}
              >
                <PenLine className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">공지사항 작성</span>
                <span className="sm:hidden">작성</span>
              </Link>
            </div>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 py-20 text-center backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-zinc-500 dark:text-zinc-400">아직 작성된 공지사항이 없습니다.</p>
            <Link
              href="/announcements/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}
            >
              <PenLine className="mr-1.5 h-4 w-4" /> 첫 공지사항 작성하기
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {pinned.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-sky-600 dark:text-sky-400">
                  <Pin className="h-4 w-4" /> 고정된 공지사항
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pinned.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} />
                  ))}
                </div>
              </section>
            )}

            {regular.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <div className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    최근 공지
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {regular.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
