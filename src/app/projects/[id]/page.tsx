import Link from "next/link";
import { ChevronLeft, Globe, Code2, Users, Star, MessageSquare, ExternalLink, ShieldCheck, Download, AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Badge } from "@/components/ui/badge";

// 나중에 DB에서 가져올 데이터의 모의 데이터
const MOCK_PROJECT = {
  id: "1",
  title: "대곽 유틸리티 허브",
  short_description: "시간표 관리, 급식 메뉴 확인 등 대곽 학생들을 위한 종합 유틸리티 도구입니다.",
  description: `## 기능 소개
- **시간표 관리**: 학급별 시간표를 자동으로 불러오고, 수행평가나 행사 일정을 캘린더에 통합 관리할 수 있습니다.
- **급식 메뉴**: 매일 아침/점심/저녁 급식 메뉴와 칼로리 정보를 제공합니다. 알레르기 유발 물질이 포함된 경우 경고를 표시합니다.
- **교내 와이파이 자동 로그인**: 스크립트를 통해 학교 와이파이 인증 페이지를 자동으로 통과합니다.

## 개발 배경
학교 생활을 하면서 매번 급식표 이미지를 찾아보거나, 나이스 접속해서 시간표를 보는 것이 번거로워 모든 것을 한 곳에서 확인할 수 있는 웹앱을 만들게 되었습니다.

## 사용 기술
- Next.js 14
- Tailwind CSS
- Supabase (Auth, Database)
- Vercel`,
  type: "Web App",
  platforms: ["Web", "iOS", "Android"],
  author: "신민규",
  author_role: "team",
  team_name: "대곽 유틸스",
  team_members: ["신민규", "김철수", "이영희"],
  tags: ["Utility", "Open Source", "Education"],
  likes: 124,
  url: "https://dshs-utility.example.com",
  source_type: "open",
  repo_url: "https://github.com/minigu5/dshs-utility",
  icon_url: "", // "https://www.google.com/s2/favicons?domain=dshs-utility.example.com&sz=128",
  license_features: ["commercial", "modify", "distribute", "private"],
  created_at: "2023-11-20T10:00:00Z"
};

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
  // TODO: 나중에 id를 사용해 Supabase에서 데이터를 가져옵니다.
  const project = MOCK_PROJECT;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/explore" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium">
            <ChevronLeft className="w-4 h-4 mr-1" /> 탐색으로 돌아가기
          </Link>
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
              {project.tags.map(tag => (
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
              {/* Note: In a real app, use a markdown renderer like react-markdown here */}
              <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                {project.description.split('\\n').map((line, i) => (
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
                  {project.author.substring(0, 1)}
                </div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {project.author_role === 'team' ? project.team_name : project.author}
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
                    {project.team_members.map(member => (
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
                    {project.platforms.map(platform => (
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
                    {project.license_features.map(lf => (
                      <li key={lf} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc">
                        {LICENSE_LABELS[lf] || lf}
                      </li>
                    ))}
                  </ul>
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
