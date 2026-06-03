import Link from "next/link";
import Image from "next/image";
import { Globe, Pencil, Terminal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  users: { full_name: string | null } | { full_name: string | null }[] | null;
};

function resolveAuthorName(p: ProjectCardData, fallback = '알 수 없음'): string {
  if (p.author_role === 'team' && p.team_name) return p.team_name;
  const u = Array.isArray(p.users) ? p.users[0] : p.users;
  return u?.full_name || fallback;
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
  const tags = (project.features ?? []).slice(0, 2);
  const platformsLabel = project.platforms && project.platforms.length > 0
    ? project.platforms.join(", ")
    : '전체';

  const cardClasses = cn(
    "group h-full rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50",
    "hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300",
    mode === 'showcase'
      ? "hover:shadow-2xl hover:shadow-blue-500/10 hover:duration-500 cursor-pointer"
      : "hover:shadow-xl hover:shadow-blue-500/5 relative",
  );

  const inner = (
    <>
      {mode === 'showcase' && (
        <div className="h-48 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 opacity-50" />
          {project.icon_url ? (
            <Image
              src={project.icon_url}
              alt={project.title}
              width={64}
              height={64}
              className="w-16 h-16 relative z-10 group-hover:scale-110 transition-transform duration-500 rounded-2xl shadow-md"
            />
          ) : (
            <Terminal className="w-16 h-16 text-zinc-300 dark:text-zinc-700 relative z-10 group-hover:scale-110 transition-transform duration-500" />
          )}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <Badge variant="secondary" className="bg-white/80 dark:bg-black/50 backdrop-blur-md">
              {project.type}
            </Badge>
          </div>
        </div>
      )}

      <CardHeader className="pt-6">
        <div className="flex gap-2 mb-3 flex-wrap">
          {mode === 'manage' && (
            <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              {project.type}
            </Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 rounded-full px-2">
              {tag}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {project.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mt-2">
          {project.short_description || "설명이 없습니다."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-500 mt-2">
          <span className="flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1" />
            {platformsLabel}
          </span>
        </div>
      </CardContent>
    </>
  );

  const author = (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
        mode === 'showcase'
          ? "bg-gradient-to-tr from-blue-500 to-purple-500 text-white"
          : "bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 text-zinc-600 dark:text-zinc-300",
      )}>
        {authorName.charAt(0)}
      </div>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{authorName}</span>
    </div>
  );

  if (mode === 'manage') {
    return (
      <Card className={cardClasses}>
        <Link href={`/projects/${project.id}`} className="block">
          {inner}
        </Link>
        <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 pb-5 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
          {author}
          <Link
            href={`/projects/${project.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full text-xs hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 z-10 relative")}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> 수정하기
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className={cardClasses}>
        {inner}
        <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 pb-5 flex justify-between items-center">
          {author}
        </CardFooter>
      </Card>
    </Link>
  );
}
