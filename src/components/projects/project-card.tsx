import Link from "next/link";
import Image from "next/image";
import { Globe, Lock, Star, MessageSquare, Pencil } from "lucide-react";

import { cn, isExternalImage } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectIcon } from "@/components/projects/project-icon";
import { ANONYMOUS_AUTHOR, PLATFORMS, projectTypeLabels } from "@/lib/constants";

// projects 테이블에서 카드 표시에 필요한 최소 컬럼들.
// users join 결과는 supabase 가 객체 또는 배열로 줄 수 있어 둘 다 허용.
export type ProjectCardData = {
  id: string;
  title: string;
  short_description: string | null;
  types: string[] | null;
  platforms: string[] | null;
  author_role: 'individual' | 'team' | 'anonymous' | null;
  team_name: string | null;
  icon_url: string | null;
  features: string[] | null;
  /** 익명이면 null — 작성자 링크·이름은 이 칸으로만 정한다(author_id 는 사용자 키로 못 읽음) */
  public_author_id: string | null;
  visibility?: 'public' | 'private' | null;
  users: { full_name: string | null; nickname: string | null; avatar_url: string | null } | { full_name: string | null; nickname: string | null; avatar_url: string | null }[] | null;
  reviews?: { rating: number }[] | null;
  click_count?: number | null;  // ← 추가
};

function resolveAuthorName(p: ProjectCardData, fallback = '알 수 없음'): string {
  if (p.author_role === 'anonymous') return ANONYMOUS_AUTHOR;
  if (p.author_role === 'team' && p.team_name) return p.team_name;
  const u = Array.isArray(p.users) ? p.users[0] : p.users;
  return u?.nickname || u?.full_name || fallback;
}

function resolveAuthorAvatar(p: ProjectCardData): string | null {
  if (p.author_role === 'team' || p.author_role === 'anonymous') return null;
  const u = Array.isArray(p.users) ? p.users[0] : p.users;
  return u?.avatar_url || null;
}

interface ProjectCardProps {
  project: ProjectCardData;
  /**
   * - showcase: 메인/탐색 페이지용. 상단 아이콘 헤더 + 작성자 푸터.
   * - manage:   마이페이지용. 아이콘 헤더 없음, 푸터에 수정 버튼.
   */
  mode?: 'showcase' | 'manage';
  /** manage 모드에서 author 정보가 없을 때 보여줄 fallback 이름 (보통 로그인 사용자명) */
  authorFallback?: string;
}

function resolveReviewStats(project: ProjectCardData): { avg: number | null; count: number } {
  const reviews = project.reviews ?? [];
  const count = reviews.length;
  const rated = reviews.filter((r) => r.rating != null);
  const avg = rated.length > 0 ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : null;
  return { avg, count };
}

export function ProjectCard({ project, mode = 'showcase', authorFallback }: ProjectCardProps) {
  const authorName = resolveAuthorName(project, authorFallback);
  const authorAvatar = resolveAuthorAvatar(project);
  const tags = (project.features ?? []).slice(0, 2);
  const { avg: avgRating, count: reviewCount } = resolveReviewStats(project);

  const isWebsite = project.types?.includes('website') ?? false;
  const hasAllPlatforms = (project.platforms?.length ?? 0) >= PLATFORMS.length;
  const displayPlatforms = (isWebsite && hasAllPlatforms)
    ? ['Web']
    : (project.platforms ?? []).map(v => PLATFORMS.find(p => p.value === v)?.label ?? v);

  const cardClasses = cn(
    "group h-full rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm",
    "hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-150 relative cursor-pointer",
  );

  const inner = (
    <>
      <CardHeader className="pt-4 pb-3">
        <div className="flex items-start gap-4">
          <ProjectIcon
            src={project.icon_url}
            title={project.title}
            className="w-12 h-12 shrink-0 rounded-[22%] mt-[26px]"
            decorative
          />
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-2 flex-wrap h-5 overflow-hidden">
              {projectTypeLabels(project.types, true).map((label) => (
                <Badge key={label} variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] h-5 px-1.5 font-semibold shrink-0">
                  {label}
                </Badge>
              ))}
              {project.visibility === 'private' && (
                <Badge variant="outline" className="text-[11px] text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 rounded-full h-5 px-1.5 gap-0.5 shrink-0">
                  <Lock className="w-2.5 h-2.5" aria-hidden /> 비공개
                </Badge>
              )}
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[11px] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 rounded-full h-5 px-2 shrink-0">
                  {tag}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-lg font-bold line-clamp-1">
              {project.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mt-1 min-h-[2.5rem]">
              {project.short_description || "설명이 없습니다."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Globe className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden />
            <span className="sr-only">지원 플랫폼:</span>
            {displayPlatforms.map((p) => (
              <span key={p} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {p}
              </span>
            ))}
          </div>
          {(avgRating !== null || reviewCount > 0) && (
            <div className="flex items-center gap-2 shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
              {avgRating !== null && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="sr-only">평균 별점</span>
                  {avgRating.toFixed(1)}
                </span>
              )}
              {reviewCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" aria-hidden />
                  <span className="sr-only">리뷰</span>
                  {reviewCount}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </>
  );

  let author = (
    <div className="flex items-center gap-2 transition-opacity">
      {authorAvatar ? (
        <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800">
          <Image 
            src={authorAvatar} 
            alt="" 
            fill 
            className="object-cover" 
            unoptimized={isExternalImage(authorAvatar)}
          />
        </div>
      ) : (
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
          "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
        )} aria-hidden>
          {authorName.charAt(0)}
        </div>
      )}
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover/author:underline">{authorName}</span>
    </div>
  );

  if (project.author_role !== 'team' && project.public_author_id) {
    author = (
      <Link href={`/developers/${project.public_author_id}`} className="group/author z-10 relative">
        {author}
      </Link>
    );
  } else {
    author = <div className="group/author">{author}</div>;
  }

  return (
    <Card className={cardClasses}>
      <div className="relative z-0">
        {inner}
      </div>

      <CardFooter className={cn(
        "border-t border-zinc-100 dark:border-zinc-800/50 pt-3 pb-4 flex justify-between items-center relative z-0",
        mode === 'manage' && "bg-zinc-50/50 dark:bg-zinc-900/20"
      )}>
        <div className="relative z-20">
          {author}
        </div>
        {mode === 'manage' && (
          <div className="flex items-center gap-2 relative z-20">
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              project.visibility === 'private'
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            )}>
              {project.visibility === 'private'
                ? <><Lock className="w-3 h-3" aria-hidden /> 비공개</>
                : <><Globe className="w-3 h-3" aria-hidden /> 공개</>
              }
            </span>
            <Link
              href={`/projects/${project.id}/edit`}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              aria-label={`${project.title} 수정`}
            >
              <Pencil className="h-3 w-3" aria-hidden />
              수정
            </Link>
          </div>
        )}
      </CardFooter>

      {/* 
        This absolute link covers the whole card (including footer background). 
        z-10 puts it above the z-0 content but below the z-20 interactive elements.
      */}
      <Link 
        href={`/projects/${project.id}`} 
        className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600" 
        aria-label={`${project.title} 상세보기`}
      />
    </Card>
  );
}
