import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { Markdown } from "@/components/shared/markdown";
import { ArticleHeader } from "@/components/shared/article-header";
import { ReadingSurface } from "@/components/shared/reading-surface";
import { ProjectIcon } from "@/components/projects/project-icon";
import { TYPE_ICONS } from "@/lib/type-icons";
import { HAEJWO_STATUS } from "@/components/haejwo/haejwo-card";
import { HaejwoOwnerActions } from "@/components/haejwo/haejwo-owner-actions";
import { HaejwoCompleteButton } from "@/components/haejwo/haejwo-complete-button";


type LinkedProject = {
  id: string;
  title: string;
  short_description: string | null;
  url: string | null;
  icon_url: string | null;
  type: string;
};

type IdeaDetail = {
  id: string;
  author_id: string;
  title: string;
  type: string;
  category: string;
  content: string;
  status: string;
  linked_project_id: string | null;
  created_at: string;
  author: { nickname: string | null; full_name: string | null; avatar_url: string | null } | null;
  linked_project: LinkedProject | LinkedProject[] | null;
};

export default async function HaejwoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [ideaResult, sessionResult] = await Promise.all([
    supabase
      .from("ideas")
      .select(
        `id, author_id, title, type, category, content, status, linked_project_id, created_at,
         author:users!ideas_author_id_fkey(nickname, full_name, avatar_url),
         linked_project:projects!ideas_linked_project_id_fkey(id, title, short_description, url, icon_url, type)`,
      )
      .eq("id", id)
      .single()
      .returns<IdeaDetail>(),
    supabase.auth.getUser(),
  ]);

  if (ideaResult.error || !ideaResult.data) notFound();

  const idea = ideaResult.data;
  const currentUser = sessionResult.data.user;
  const isOwner = currentUser?.id === idea.author_id;

  const author = Array.isArray(idea.author) ? idea.author[0] ?? null : idea.author;
  const authorName = author?.nickname ?? author?.full_name ?? "익명";
  const typeName = PROJECT_TYPES.find((t) => t.value === idea.type)?.label ?? idea.type;
  const categoryName = FEATURES.find((f) => f.value === idea.category)?.label ?? idea.category;
  const status = HAEJWO_STATUS[idea.status] ?? HAEJWO_STATUS.open;
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), {
    addSuffix: true,
    locale: ko,
  });

  const linkedProject = Array.isArray(idea.linked_project)
    ? idea.linked_project[0] ?? null
    : idea.linked_project;

  const TypeIcon = TYPE_ICONS[idea.type];

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <ArticleHeader
          backHref="/haejwo"
          backLabel="해줘!"
          actions={isOwner && idea.status !== "done" ? <HaejwoOwnerActions ideaId={idea.id} /> : undefined}
          chips={
            <>
              <span className={cn("inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold", status.cls)}>
                {status.label}
              </span>
              <span className="inline-flex h-5 items-center gap-1 rounded-full border border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {TypeIcon && <TypeIcon className="h-3 w-3" aria-hidden />}
                {typeName}
              </span>
              <span className="inline-flex h-5 items-center rounded-full border border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {categoryName}
              </span>
            </>
          }
          title={idea.title}
          author={{ id: idea.author_id, name: authorName, avatarUrl: author?.avatar_url ?? null }}
          dateLabel={timeAgo}
        />

        <ReadingSurface className="mt-7">
          <Markdown>{idea.content}</Markdown>
        </ReadingSurface>

        {/* 완료: 연결된 프로젝트 카드 */}
        {idea.status === "done" && linkedProject && (
          <Link
            href={`/projects/${linkedProject.id}`}
            className="mt-5 flex items-center gap-3.5 rounded-[20px] border border-emerald-300 bg-emerald-50/60 p-4 transition-colors hover:border-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:border-emerald-700"
          >
            <ProjectIcon src={linkedProject.icon_url} title={linkedProject.title} className="h-11 w-11 shrink-0 rounded-[22%]" decorative />
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                구현된 프로젝트
              </span>
              <span className="mt-0.5 block truncate text-[15px] font-semibold text-zinc-900 dark:text-white">{linkedProject.title}</span>
              {linkedProject.short_description && (
                <span className="block truncate text-[13px] text-zinc-600 dark:text-zinc-400">{linkedProject.short_description}</span>
              )}
            </span>
          </Link>
        )}

        {/* 미완료 + 로그인: 구현완료 유도 */}
        {currentUser && idea.status !== "done" && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <b className="mb-0.5 block font-semibold text-zinc-900 dark:text-white">이 아이디어, 만들었어요?</b>
              내 프로젝트와 연결하면 요청이 &ldquo;완료&rdquo;로 바뀌어요.
            </p>
            <HaejwoCompleteButton ideaId={idea.id} />
          </div>
        )}
      </main>
    </div>
  );
}
