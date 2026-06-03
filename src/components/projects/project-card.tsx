import Link from "next/link";
import Image from "next/image";
import { Globe, Pencil, Terminal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn, isExternalImage } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectIcon } from "@/components/projects/project-icon";

// projects 테이블에서 카드 표시에 필요한 최소 컬럼들.
// users join 결과는 supabase 가 객체 또는 배열로 줄 수 있어 둘 다 허용.
export type ProjectCardData = {
  id: string;
  title: string;
  short_description: string | null;
  type: string;
  platforms: string[] | null;
  author_role: 'individual' | 'team' | null;
  team_name: string | null;
  icon_url: string | null;
  features: string[] | null;
  author_id: string;
  users: { full_name: string | null; nickname: string | null; avatar_url: string | null } | { full_name: string | null; nickname: string | null; avatar_url: string | null }[] | null;
};

function resolveAuthorName(p: ProjectCardData, fallback = '알 수 없음'): string {
  if (p.author_role === 'team' && p.team_name) return p.team_name;
  const u = Array.isArray(p.users) ? p.users[0] : p.users;
  return u?.nickname || u?.full_name || fallback;
}

function resolveAuthorAvatar(p: ProjectCardData): string | null {
  if (p.author_role === 'team') return null;
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

export function ProjectCard({ project, mode = 'showcase', authorFallback }: ProjectCardProps) {
  const authorName = resolveAuthorName(project, authorFallback);
  const authorAvatar = resolveAuthorAvatar(project);
  const tags = (project.features ?? []).slice(0, 2);
  const platformsLabel = project.platforms && project.platforms.length > 0
    ? project.platforms.join(", ")
    : '전체';

  const cardClasses = cn(
    "group h-full rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm",
    "hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 relative cursor-pointer",
    mode === 'showcase'
      ? "hover:shadow-2xl hover:shadow-blue-500/10 hover:duration-500"
      : "hover:shadow-xl hover:shadow-blue-500/5",
  );

  const inner = (
    <>
      <CardHeader className="pt-8 pb-4">
        <div className="flex items-start gap-4">
          <ProjectIcon 
            src={project.icon_url} 
            title={project.title} 
            className="w-12 h-12 shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-800 group-hover:scale-105 transition-transform duration-300" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-2 flex-wrap h-5 overflow-hidden">
              <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] h-5 px-1.5 font-semibold shrink-0">
                {project.type}
              </Badge>
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 rounded-full h-5 px-2 shrink-0">
                  {tag}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
              {project.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mt-1 min-h-[2.5rem]">
              {project.short_description || "설명이 없습니다."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-500">
          <span className="flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1" />
            {platformsLabel}
          </span>
        </div>
      </CardContent>
    </>
  );

  let author = (
    <div className="flex items-center gap-2 group-hover/author:opacity-80 transition-opacity">
      {authorAvatar ? (
        <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800">
          <Image 
            src={authorAvatar} 
            alt={authorName} 
            fill 
            className="object-cover" 
            unoptimized={isExternalImage(authorAvatar)}
          />
        </div>
      ) : (
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
          mode === 'showcase'
            ? "bg-gradient-to-tr from-blue-500 to-purple-500 text-white"
            : "bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 text-zinc-600 dark:text-zinc-300",
        )}>
          {authorName.charAt(0)}
        </div>
      )}
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover/author:underline">{authorName}</span>
    </div>
  );

  if (project.author_role !== 'team' && project.author_id) {
    author = (
      <Link href={`/developers/${project.author_id}`} className="group/author z-10 relative">
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
        "border-t border-zinc-100 dark:border-zinc-800/50 pt-4 pb-5 flex justify-between items-center relative z-0",
        mode === 'manage' && "bg-zinc-50/50 dark:bg-zinc-900/20"
      )}>
        <div className="relative z-20">
          {author}
        </div>
        {mode === 'manage' && (
          <Link
            href={`/projects/${project.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }), 
              "rounded-full text-xs hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 relative z-20"
            )}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> 수정하기
          </Link>
        )}
      </CardFooter>

      {/* 
        This absolute link covers the whole card (including footer background). 
        z-10 puts it above the z-0 content but below the z-20 interactive elements.
      */}
      <Link 
        href={`/projects/${project.id}`} 
        className="absolute inset-0 z-10" 
        aria-label={`${project.title} 상세보기`}
      />
    </Card>
  );
}
