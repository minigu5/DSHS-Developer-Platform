export const revalidate = 30;

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Pin } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ArticleHeader } from "@/components/shared/article-header";
import { ReadingSurface } from "@/components/shared/reading-surface";
import { announcementCategoryColor, announcementCategoryLabel } from "@/lib/announcement-colors";
import { Markdown } from "@/components/shared/markdown";
import { AnnouncementOwnerActions } from "@/components/announcements/announcement-owner-actions";
import { AnnouncementPinButton } from "@/components/announcements/announcement-pin-button";
import { isDeveloper } from "@/lib/constants";

type AnnouncementDetailRow = {
  id: string;
  author_id: string;
  title: string;
  category: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author:
    | { nickname: string | null; full_name: string | null; avatar_url: string | null }
    | { nickname: string | null; full_name: string | null; avatar_url: string | null }[]
    | null;
};


export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [announcementResult, sessionResult] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        `id, author_id, title, category, content, is_pinned, created_at, updated_at,
         author:users!announcements_author_id_fkey(nickname, full_name, avatar_url)`,
      )
      .eq("id", id)
      .single<AnnouncementDetailRow>(),
    supabase.auth.getUser(),
  ]);

  const { data: announcement, error } = announcementResult;
  if (error || !announcement) notFound();

  const currentUser = sessionResult.data.user;
  const author = Array.isArray(announcement.author)
    ? announcement.author[0] ?? null
    : announcement.author;
  const authorName = author?.nickname || author?.full_name || "알 수 없음";

  const isEdited =
    new Date(announcement.updated_at).getTime() - new Date(announcement.created_at).getTime() > 5000;

  const isAdmin = isDeveloper(currentUser?.email);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <ArticleHeader
          backHref="/announcements"
          backLabel="공지사항"
          actions={
            <>
              {isAdmin && <AnnouncementPinButton announcementId={announcement.id} isPinned={announcement.is_pinned} />}
              <AnnouncementOwnerActions
                announcementId={announcement.id}
                authorId={announcement.author_id}
                currentUserId={currentUser?.id ?? null}
                isAdmin={isAdmin}
              />
            </>
          }
          chips={
            <>
              {announcement.is_pinned && (
                <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-sky-100 px-2.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Pin className="h-3 w-3" aria-hidden />
                  고정
                </span>
              )}
              <span
                className={cn(
                  "inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold",
                  announcementCategoryColor(announcement.category),
                )}
              >
                {announcementCategoryLabel(announcement.category)}
              </span>
            </>
          }
          title={announcement.title}
          author={{ id: announcement.author_id, name: authorName, avatarUrl: author?.avatar_url ?? null }}
          dateLabel={format(new Date(announcement.created_at), "yyyy년 M월 d일", { locale: ko })}
          extraMeta={isEdited ? "수정됨" : undefined}
        />

        <ReadingSurface className="mt-7">
          <Markdown>{announcement.content}</Markdown>
        </ReadingSurface>
      </main>
    </div>
  );
}
