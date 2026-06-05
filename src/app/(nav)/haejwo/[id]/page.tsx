import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Megaphone, CheckCircle2, ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { Markdown } from "@/components/shared/markdown";
import { HaejwoOwnerActions } from "@/components/haejwo/haejwo-owner-actions";
import { HaejwoCompleteButton } from "@/components/haejwo/haejwo-complete-button";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: "구현 요청 중", cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  in_progress: { label: "개발 중", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "완료", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

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
  const status = STATUS_LABELS[idea.status] ?? STATUS_LABELS.open;
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), {
    addSuffix: true,
    locale: ko,
  });

  const linkedProject = Array.isArray(idea.linked_project)
    ? idea.linked_project[0] ?? null
    : idea.linked_project;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-orange-500/8 blur-[120px] dark:bg-orange-600/8" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/haejwo"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-full text-zinc-500",
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            목록으로
          </Link>
        </div>

        <article className="rounded-3xl border border-zinc-200 bg-white/70 p-6 sm:p-8 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
              <Megaphone className="h-3 w-3" />
              해줘!
            </div>
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {typeName}
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {categoryName}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                status.cls,
              )}
            >
              {status.label}
            </span>
            {isOwner && idea.status !== "done" && <HaejwoOwnerActions ideaId={idea.id} />}
          </div>

          <h1 className="mb-6 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {idea.title}
          </h1>

          <div className="mb-8 flex items-center gap-2 text-sm text-zinc-400">
            <span>{authorName}</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800">
            <Markdown>{idea.content}</Markdown>
          </div>

          {/* 구현된 프로젝트 */}
          {idea.status === "done" && linkedProject && (
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                구현된 프로젝트
              </div>
              <Link
                href={`/projects/${linkedProject.id}`}
                className="group flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                    {linkedProject.title}
                  </p>
                  {linkedProject.short_description && (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {linkedProject.short_description}
                    </p>
                  )}
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 group-hover:text-emerald-600" />
              </Link>
            </div>
          )}

          {/* 구현완료 버튼 — 로그인된 사용자에게만, 이미 완료된 경우 숨김 */}
          {currentUser && idea.status !== "done" && (
            <div className="mt-10 border-t border-zinc-100 pt-8 dark:border-zinc-800">
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                이 아이디어를 구현하셨나요? 내 프로젝트와 연결해 완료 처리하세요.
              </p>
              <HaejwoCompleteButton ideaId={idea.id} />
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
