export const revalidate = 30;

import Link from "next/link";
import { Bell, PenLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { announcementSummary } from "@/lib/announcement-summary";
import { PageHero } from "@/components/shared/page-hero";
import { AnnouncementCard, type AnnouncementCardData } from "@/components/announcements/announcement-card";

export const metadata = {
  title: "공지사항 — DSHS Developer Platform",
};

type AnnouncementRowJoined = {
  id: string;
  title: string;
  category: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author: AnnouncementCardData["author"] | AnnouncementCardData["author"][] | null;
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select(
      `id, title, category, content, is_pinned, created_at,
       author:users!announcements_author_id_fkey(nickname, full_name, avatar_url)`,
    )
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AnnouncementRowJoined[]>();

  // 고정 공지가 먼저 오도록 서버에서 정렬돼 있어 한 그리드에 그대로 놓는다
  const announcements: AnnouncementCardData[] = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    is_pinned: a.is_pinned,
    created_at: a.created_at,
    summary: announcementSummary(a.content ?? ""),
    author: Array.isArray(a.author) ? a.author[0] ?? null : a.author,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="announcements"
        icon={Bell}
        title="공지사항"
        description="베타 테스터 모집, 업데이트 소식, 의견 요청을 올리는 게시판이에요."
        actions={
          <Link
            href="/announcements/new"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-5 text-sm", SECTION_COLORS.announcements.button)}
          >
            <PenLine className="mr-1.5 h-4 w-4" aria-hidden />
            공지 작성
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        {announcements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">아직 작성된 공지사항이 없어요.</p>
            <Link
              href="/announcements/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4 h-9 rounded-full", SECTION_COLORS.announcements.button)}
            >
              <PenLine className="mr-1.5 h-4 w-4" aria-hidden /> 첫 공지 작성하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
