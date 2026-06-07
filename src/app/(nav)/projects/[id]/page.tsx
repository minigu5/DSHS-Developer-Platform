export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Globe, Code2, Lock, Star, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn, isExternalImage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ProjectReviews } from "@/components/projects/project-reviews";
import { ProjectIcon } from "@/components/projects/project-icon";
import { EditButton } from "@/components/projects/edit-button";
import type { ReviewItem } from "@/components/projects/review-list";
import { LICENSE_FEATURES, isDeveloper } from "@/lib/constants";
import { Markdown } from "@/components/shared/markdown";

const LICENSE_LABELS: Record<string, string> = {
  commercial: "상업적 이용",
  modify: "수정",
  distribute: "배포",
  private: "개인적 이용",
  liability: "법적 책임(Author)",
  warranty: "보증 제공"
};

const RESTRICTED_LABELS: Record<string, string> = {
  commercial: "상업적 이용 불가",
  modify: "수정 불가",
  distribute: "배포 불가",
  private: "개인적 이용 제한",
  liability: "법적 책임 무관",
  warranty: "보증 미제공"
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 개발자 계정은 비공개 프로젝트도 볼 수 있도록 어드민 클라이언트 사용
  const queryClient = isDeveloper(user?.email) ? createAdminClient() : supabase;

  const [projectResult, reviewsResult] = await Promise.all([
    queryClient
      .from('projects')
      .select(`*, users (*)`)
      .eq('id', id)
      .single(),
    queryClient
      .from('reviews')
      .select('id, rating, comment, created_at, user_id, user:users(*)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const { data: project, error } = projectResult;

  if (error || !project) {
    notFound();
  }

  const { data: reviewsData } = reviewsResult;

  // 팀 프로젝트인 경우 팀원 프로필 조회
  const teamMemberProfiles: Array<{
    id: string;
    email: string;
    nickname: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }> = [];
  if (project.author_role === 'team' && project.team_members?.length) {
    const { data: members } = await queryClient
      .from('users')
      .select('id, email, nickname, full_name, avatar_url')
      .in('email', project.team_members);
    if (members) teamMemberProfiles.push(...members);
  }

  const reviews: ReviewItem[] = (reviewsData ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    user_id: r.user_id,
    user: Array.isArray(r.user) ? r.user[0] ?? null : r.user,
  }));

  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  const authorName =
    (project.author_role === 'team'
      ? project.team_name
      : project.users?.nickname || project.users?.full_name) ?? '알 수 없음';
  const tags = project.features || [];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50 dark:bg-[#09090b] font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        {/* Project Header Section */}
        <div className="flex items-start gap-4 sm:gap-6 mb-10">
          <ProjectIcon 
            src={project.icon_url} 
            title={project.title} 
            className="w-16 h-16 md:w-20 md:h-20 shrink-0 shadow-lg border border-zinc-200/50 dark:border-zinc-800/50" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 text-[10px] h-5 px-2">{project.type}</Badge>
              {tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 text-[10px] h-5 px-2">{tag}</Badge>
              ))}
            </div>
            
            <h1 className="text-2xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight leading-tight">{project.title}</h1>
            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed max-w-2xl">
              {project.short_description}
            </p>
            
            <div className="flex items-center gap-2 mb-8 text-sm">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "w-4 h-4",
                      n <= Math.round(avgRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-zinc-300 dark:text-zinc-600",
                    )}
                  />
                ))}
              </div>
              {reviewCount > 0 ? (
                <span className="text-zinc-600 dark:text-zinc-400">
                  {avgRating.toFixed(1)} · 리뷰 {reviewCount}개
                </span>
              ) : (
                <span className="text-zinc-500">아직 리뷰가 없습니다</span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {project.url && (
                <a href={project.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg" }), "rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium")}>
                  <ExternalLink className="w-4 h-4 mr-2" /> 웹사이트 방문
                </a>
              )}
              {project.source_type === 'open' && project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full font-medium border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
                  <Code2 className="w-4 h-4 mr-2" /> GitHub 저장소
                </a>
              )}
              <EditButton projectId={project.id} authorId={project.author_id} teamMembers={project.team_members} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content: Description */}
          <div className="md:col-span-2 space-y-8">
            <section className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl p-6 sm:p-8">
              <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">프로젝트 상세</h3>
              <Markdown>{project.description ?? ""}</Markdown>
            </section>
          </div>

          {/* Sidebar: Meta info */}
          <aside className="space-y-6">
            
            {/* Developer / Team Info */}
            <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl p-6">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">개발자 정보</h4>
              {project.author_role === 'team' ? (
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold shrink-0">
                      {authorName.substring(0, 1)}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">{authorName}</div>
                      <div className="text-xs text-zinc-500">팀 프로젝트</div>
                    </div>
                  </div>
                  {teamMemberProfiles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">팀원</div>
                      {teamMemberProfiles.map(member => {
                        const memberName = member.nickname || member.full_name || member.email;
                        return (
                          <Link
                            key={member.id}
                            href={`/developers/${member.id}`}
                            className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                          >
                            <div className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-700 dark:text-blue-300 text-sm font-bold border border-zinc-200 dark:border-zinc-800 shrink-0">
                              {member.avatar_url ? (
                                <Image
                                  src={member.avatar_url}
                                  alt={memberName}
                                  fill
                                  className="object-cover"
                                  unoptimized={isExternalImage(member.avatar_url)}
                                />
                              ) : (
                                memberName.charAt(0)
                              )}
                            </div>
                            <div className="font-medium text-sm text-zinc-900 dark:text-white group-hover:underline">
                              {memberName}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link href={`/developers/${project.author_id}`} className="flex items-center gap-3 mb-4 group block hover:opacity-80 transition-opacity">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-700 dark:text-blue-300 font-bold border border-zinc-200 dark:border-zinc-800">
                    {project.users?.avatar_url ? (
                      <Image
                        src={project.users.avatar_url}
                        alt={authorName}
                        fill
                        className="object-cover"
                        unoptimized={isExternalImage(project.users.avatar_url)}
                      />
                    ) : (
                      authorName.substring(0, 1)
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-white group-hover:underline">
                      {authorName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      개인 프로젝트
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Platform & Environment */}
            <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl p-6">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">환경 및 플랫폼</h4>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">지원 플랫폼</div>
                  <div className="flex flex-wrap gap-2">
                    {project.platforms?.map((platform: string) => (
                      <span key={platform} className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Globe className="w-3 h-3 mr-1.5" /> {platform}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* License & Source */}
            <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm rounded-3xl p-6">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-6 uppercase tracking-wider">라이선스 및 소스코드</h4>
              
              <div className="space-y-6">
                {/* Allowed Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">허용됨</span>
                  </div>
                  {(project.license_features && project.license_features.length > 0) ? (
                    <ul className="grid grid-cols-1 gap-2 ml-1">
                      {project.license_features.map((lf: string) => (
                        <li key={lf} className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2.5 shrink-0" />
                          {LICENSE_LABELS[lf] || lf}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-500 ml-6">허용된 항목이 없습니다.</p>
                  )}
                </div>

                {/* Restricted Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">제한 / 조건</span>
                  </div>
                  {(() => {
                    const allowed = project.license_features || [];
                    const restricted = LICENSE_FEATURES.filter(f => !allowed.includes(f.value));
                    
                    if (restricted.length === 0) return <p className="text-xs text-zinc-500 ml-6">모든 권한이 허용되었습니다.</p>;
                    
                    return (
                      <ul className="grid grid-cols-1 gap-2 ml-1">
                        {restricted.map(f => (
                          <li key={f.value} className="flex items-center text-sm text-zinc-500 dark:text-zinc-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mr-2.5 shrink-0" />
                            {RESTRICTED_LABELS[f.value] || f.label}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>

                {project.license_custom && (
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-400 mb-2">커스텀 조건</div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">"{project.license_custom}"</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">공개 여부</span>
                  {project.visibility === 'private' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <Lock className="w-3 h-3" /> 비공개
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      <Globe className="w-3 h-3" /> 공개
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">소스코드</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {project.source_type === 'open' ? '오픈소스' : '비공개'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">등록일</span>
                  <span className="text-zinc-900 dark:text-white">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

          </aside>
        </div>

        <ProjectReviews
          projectId={project.id}
          reviews={reviews}
        />
      </main>
    </div>
  );
}
