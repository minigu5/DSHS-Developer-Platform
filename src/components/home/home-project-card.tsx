import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";

import { cn, isExternalImage } from "@/lib/utils";
import { PLATFORMS, projectTypeLabels } from "@/lib/constants";
import { ProjectIcon } from "@/components/projects/project-icon";
import type { ProjectCardData } from "@/components/projects/project-card";

function authorOf(p: ProjectCardData): { name: string; avatar: string | null } {
  const u = Array.isArray(p.users) ? p.users[0] : p.users;
  if (p.author_role === "team" && p.team_name) return { name: p.team_name, avatar: null };
  return { name: u?.nickname || u?.full_name || "알 수 없음", avatar: u?.avatar_url ?? null };
}

/**
 * 홈 전용 프로젝트 카드 — 홈의 다른 섹션 카드와 같은 20px 모서리·테두리·그림자 없음 언어.
 * 탐색·프로필의 `ProjectCard`(24px, shadow-sm)와는 별개로 둔다. 카드 전체가 링크라 작성자는 링크 없이 표시.
 */
export function HomeProjectCard({ project, className }: { project: ProjectCardData; className?: string }) {
  const author = authorOf(project);
  const tags = (project.features ?? []).slice(0, 2);
  const isWebsite = project.types?.includes("website") ?? false;
  const hasAllPlatforms = (project.platforms?.length ?? 0) >= PLATFORMS.length;
  const platforms =
    isWebsite && hasAllPlatforms
      ? ["Web"]
      : (project.platforms ?? []).map((v) => PLATFORMS.find((p) => p.value === v)?.label ?? v);

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "flex h-full flex-col rounded-[20px] border border-zinc-200 bg-white transition-colors hover:border-zinc-400",
        "dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        className,
      )}
    >
      <div className="flex items-start gap-4 p-5 pb-3">
        <ProjectIcon
          src={project.icon_url}
          title={project.title}
          decorative
          className="mt-[26px] h-12 w-12 shrink-0 rounded-[22%]"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex h-5 flex-wrap gap-2 overflow-hidden">
            {projectTypeLabels(project.types, true).map((label) => (
              <span
                key={label}
                className="inline-flex h-5 shrink-0 items-center rounded-md bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {label}
              </span>
            ))}
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-5 shrink-0 items-center rounded-full border border-zinc-200 px-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="truncate text-lg font-bold text-zinc-900 dark:text-white">{project.title}</h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {project.short_description || "설명이 없습니다."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-5 pb-3">
        <Globe className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
        <span className="sr-only">지원 플랫폼:</span>
        {platforms.map((p) => (
          <span
            key={p}
            className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {p}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-zinc-100 px-5 pb-4 pt-3 dark:border-zinc-800/60">
        {author.avatar ? (
          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800">
            <Image src={author.avatar} alt="" fill sizes="28px" className="object-cover" unoptimized={isExternalImage(author.avatar)} />
          </span>
        ) : (
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
          >
            {author.name.charAt(0)}
          </span>
        )}
        <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{author.name}</span>
      </div>
    </Link>
  );
}
