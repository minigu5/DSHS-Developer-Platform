import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { cn, isExternalImage } from "@/lib/utils";
import { ProjectIcon } from "@/components/projects/project-icon";

type AuthorProfile = { full_name: string | null; nickname: string | null; avatar_url: string | null };

export type FeaturedProjectData = {
  id: string;
  title: string;
  short_description: string | null;
  icon_url: string | null;
  click_count: number | null;
  author_id: string;
  author_role: "individual" | "team" | null;
  team_name: string | null;
  users: AuthorProfile | AuthorProfile[] | null;
};

function resolveAuthor(p: FeaturedProjectData): { name: string; avatar: string | null; href: string | null } {
  if (p.author_role === "team" && p.team_name) return { name: p.team_name, avatar: null, href: null };
  const u = Array.isArray(p.users) ? p.users[0] : p.users;
  return {
    name: u?.nickname || u?.full_name || "알 수 없음",
    avatar: u?.avatar_url ?? null,
    href: p.author_id ? `/developers/${p.author_id}` : null,
  };
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-xl";

/**
 * 홈의 "가장 많이 열어본 프로젝트" 카드 — 방문 수(click_count) 1위를 파란 단색 카드로 크게 보여 준다.
 * 방문 기록이 하나도 없으면 아무것도 렌더링하지 않는다.
 */
export function FeaturedProject({ project }: { project: FeaturedProjectData | null }) {
  if (!project || (project.click_count ?? 0) < 1) return null;

  const author = resolveAuthor(project);
  const authorInner = (
    <>
      {author.avatar ? (
        <span className="relative inline-block h-6 w-6 shrink-0 overflow-hidden rounded-full">
          <Image src={author.avatar} alt="" fill className="object-cover" unoptimized={isExternalImage(author.avatar)} />
        </span>
      ) : (
        <span
          aria-hidden
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-900 text-[11px] font-bold text-blue-200"
        >
          {author.name.charAt(0)}
        </span>
      )}
      {author.name}
    </>
  );

  return (
    <article
      aria-labelledby="featured-title"
      className="grid items-center gap-8 rounded-[32px] bg-blue-700 p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-11"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-sm font-medium text-blue-200">가장 많이 열어본 프로젝트</p>
        <h2 id="featured-title" className="text-3xl font-bold leading-tight break-keep sm:text-4xl">
          {project.title}
        </h2>
        {project.short_description && (
          <p className="max-w-[520px] text-base leading-relaxed text-blue-100 break-keep sm:text-lg">
            {project.short_description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Link
            href={`/projects/${project.id}`}
            className={cn(
              "inline-flex h-11 items-center gap-2 bg-white px-5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50",
              FOCUS_RING,
            )}
          >
            열어보기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {author.href ? (
            <Link href={author.href} className={cn("inline-flex items-center gap-2 text-sm text-blue-100 hover:underline underline-offset-4", FOCUS_RING)}>
              {authorInner}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-blue-100">{authorInner}</span>
          )}
          <span className="font-mono text-[13px] tabular-nums text-blue-200">방문 {project.click_count}회</span>
        </div>
      </div>

      <div className="flex lg:justify-center">
        <div className="rounded-[22%] bg-white p-5 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)]">
          <ProjectIcon src={project.icon_url} title={project.title} decorative className="h-32 w-32 rounded-[22%] sm:h-40 sm:w-40" />
        </div>
      </div>
    </article>
  );
}
