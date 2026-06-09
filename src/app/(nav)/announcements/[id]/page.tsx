export const revalidate = 30;

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Pin } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn, isExternalImage } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { AnnouncementOwnerActions } from "@/components/announcements/announcement-owner-actions";
import { AnnouncementPinButton } from "@/components/announcements/announcement-pin-button";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";
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

const CATEGORY_COLORS: Record<string, string> = {
  promotion: "border-sky-200 text-sky-600 dark:border-sky-900/50 dark:text-sky-400",
  beta:      "border-violet-200 text-violet-600 dark:border-violet-900/50 dark:text-violet-400",
  feedback:  "border-emerald-200 text-emerald-600 dark:border-emerald-900/50 dark:text-emerald-400",
  update:    "border-amber-200 text-amber-600 dark:border-amber-900/50 dark:text-amber-400",
  general:   "border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
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

  const categoryLabel =
    ANNOUNCEMENT_CATEGORIES.find((c) => c.value === announcement.category)?.label ??
    announcement.category;
  const colorClass = CATEGORY_COLORS[announcement.category] ?? CATEGORY_COLORS.general;
  const isEdited =
    new Date(announcement.updated_at).getTime() - new Date(announcement.created_at).getTime() > 5000;

  const isAdmin = isDeveloper(currentUser?.email);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-8">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/announcements"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-full text-zinc-500",
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            목록으로
          </Link>
        </div>
        <div className="mb-2 mt-4 flex min-h-[32px] items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {announcement.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                <Pin className="h-3 w-3" /> 고정됨
              </span>
            )}
            <Badge
              variant="outline"
              className={`h-6 rounded-full px-2.5 text-xs ${colorClass}`}
            >
              {categoryLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <AnnouncementPinButton
                announcementId={announcement.id}
                isPinned={announcement.is_pinned}
              />
            )}
            <AnnouncementOwnerActions
              announcementId={announcement.id}
              authorId={announcement.author_id}
              currentUserId={currentUser?.id ?? null}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        <article>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            {announcement.title}
          </h1>

          <div className="mt-6 flex items-center gap-3 border-b border-zinc-100 pb-6 dark:border-zinc-800/50">
            <Link
              href={`/developers/${announcement.author_id}`}
              className="group/author flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-tr from-sky-100 to-blue-100 dark:border-zinc-800 dark:from-sky-900/40 dark:to-blue-900/40">
                {author?.avatar_url ? (
                  <Image
                    src={author.avatar_url}
                    alt={authorName}
                    fill
                    className="object-cover"
                    unoptimized={isExternalImage(author.avatar_url)}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-bold text-sky-700 dark:text-sky-300">
                    {authorName.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 underline-offset-2 group-hover/author:underline dark:text-white">{authorName}</div>
                <div className="text-xs text-zinc-400">
                  {format(new Date(announcement.created_at), "yyyy년 M월 d일", { locale: ko })}
                  {isEdited && " (수정됨)"}
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-8">
            <Markdown>{announcement.content}</Markdown>
          </div>
        </article>
      </main>
    </div>
  );
}
