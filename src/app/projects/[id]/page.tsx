import { notFound } from "next/navigation";
import { ChevronLeft, Globe, Code2, Users, Star, MessageSquare, ExternalLink, ShieldCheck, Download, AlertCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";

const LICENSE_LABELS: Record<string, string> = {
  commercial: "상업적 이용",
  modify: "수정",
  distribute: "배포",
  private: "개인적 이용",
  liability: "법적 책임",
  warranty: "보증"
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      users (full_name)
    `)
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  const authorName =
    (project.author_role === 'team'
      ? project.team_name
      : project.users?.full_name) ?? '알 수 없음';
  const tags = project.features || [];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <BackButton fallbackUrl="/explore" />
          <AuthButtons />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        {/* Project Header Section */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
          {/* Icon */}
          <div className="w-32 h-32 shrink-0 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden">
            {project.icon_url ? (
              <img src={project.icon_url} alt={`${project.title} icon`} className="w-full h-full object-cover" />
            ) : (
              <div className="text-4xl font-bold text-zinc-300 dark:text-zinc-700">{project.title.substring(0, 1)}</div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200">{project.type}</Badge>
              {tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700">{tag}</Badge>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">{project.title}</h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
              {project.short_description}
            </p>
            
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content: Description */}
          <div className="md:col-span-2 space-y-8">
            <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">프로젝트 상세</h3>
              <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                {project.description?.split('\\n').map((line: string, i: number) => (
                  <p key={i} className="mb-4 whitespace-pre-wrap leading-relaxed">{line}</p>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: Meta info */}
          <aside className="space-y-6">
            
            {/* Developer / Team Info */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">개발자 정보</h4>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                  {authorName.substring(0, 1)}
                </div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {authorName}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {project.author_role === 'team' ? '팀 프로젝트' : '개인 프로젝트'}
                  </div>
                </div>
              </div>
              
              {project.author_role === 'team' && project.team_members && project.team_members.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs font-medium text-zinc-500 mb-2">팀원</div>
                  <div className="flex flex-wrap gap-2">
                    {project.team_members.map((member: string) => (
                      <span key={member} className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Platform & Environment */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
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
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">라이선스 및 소스코드</h4>
              
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">허용되는 권한</span>
                </div>
                {project.license_features && project.license_features.length > 0 ? (
                  <ul className="space-y-1 ml-6">
                    {project.license_features.map((lf: string) => (
                      <li key={lf} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                        {LICENSE_LABELS[lf] || lf}
                      </li>
                    ))}
                  </ul>
                ) : project.license_custom ? (
                  <span className="text-sm text-zinc-500 ml-6">{project.license_custom}</span>
                ) : (
                  <span className="text-sm text-zinc-500 ml-6">설정된 라이선스가 없습니다.</span>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">소스코드</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {project.source_type === 'open' ? '오픈소스' : '비공개'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-zinc-500">등록일</span>
                  <span className="text-zinc-900 dark:text-white">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </main>
    </div>
  );
}
