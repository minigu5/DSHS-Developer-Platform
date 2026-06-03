import Link from "next/link";
import { ArrowRight, Code2, Globe, Layout, Search, Sparkles, Terminal, Layers } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data for display purposes
const FEATURED_PROJECTS = [
  {
    id: "1",
    title: "대곽 유틸리티 허브",
    short_description: "시간표 관리, 급식 메뉴 확인 등 대곽 학생들을 위한 종합 유틸리티 도구입니다.",
    description: "시간표 관리, 급식 메뉴 확인 등 대곽 학생들을 위한 종합 유틸리티 도구입니다. 더 많은 상세 설명...",
    type: "Web App",
    platforms: ["Web", "iOS", "Android"],
    author: "신민규",
    tags: ["Utility", "Open Source"],
    likes: 124,
  },
  {
    id: "2",
    title: "양자물리 시뮬레이터",
    short_description: "고급 물리 수업에서 다루는 양자역학 개념들을 3D로 시각화한 인터랙티브 시뮬레이션.",
    description: "고급 물리 수업에서 다루는 양자역학 개념들을 3D로 시각화한 인터랙티브 시뮬레이션. 상세 설명...",
    type: "Application",
    platforms: ["macOS", "Windows"],
    author: "물리부 팀",
    tags: ["Education", "3D"],
    likes: 89,
  },
  {
    id: "3",
    title: "Chem-AI 어시스턴트",
    short_description: "화학 반응식을 자동으로 맞춰주고 반응 결과를 예측해주는 AI 기반 학습 도구.",
    description: "화학 반응식을 자동으로 맞춰주고 반응 결과를 예측해주는 AI 기반 학습 도구. 상세 설명...",
    type: "AI Tool",
    platforms: ["Web"],
    author: "AI 스터디 그룹",
    tags: ["AI", "Chemistry"],
    likes: 210,
  }
];

export default function DemoHomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black overflow-hidden font-sans">
      
      {/* HEADER (Auth only) */}
      <header className="absolute top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-end">
          <AuthButtons />
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex items-center justify-center flex-col text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

        <Badge variant="outline" className="mb-6 py-1.5 px-4 backdrop-blur-md bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-sm">
          <Sparkles className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          DSHS Developer Platform에 오신 것을 환영합니다
        </Badge>
        
        <h1 className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-8 leading-tight break-keep">
          발견하고, 공유하고, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            새로움을 창조하세요.
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed break-keep">
          대구과학고 학생들이 개발한 소프트웨어 프로젝트를 전시하고, 유용한 피드백을 주고받으며, 새로운 아이디어를 함께 발전시키는 중앙 허브입니다.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto z-10">
          <Link href="/explore" className={cn(buttonVariants({ size: "lg" }), "rounded-full h-14 px-8 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105")}>
            <Search className="mr-2 h-5 w-5" /> 프로젝트 둘러보기
          </Link>
          <Link href="/projects/new" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full h-14 px-8 text-base border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:scale-105")}>
            <Code2 className="mr-2 h-5 w-5" /> 내 프로젝트 등록하기
          </Link>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">학생들을 위해 만들어진 플랫폼</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg break-keep">
              @ts.hs.kr 계정으로 안전하게 로그인하고 대곽 개발자들의 창의적인 세계에 빠져보세요.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">체계적인 포트폴리오</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                프로그램 종류, 지원 플랫폼, 라이선스별로 어플리케이션을 분류하여 누구나 필요한 프로그램을 쉽게 찾을 수 있습니다.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">오픈소스 & 클로즈드소스</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                커뮤니티에 코드 저장소를 공유하거나 비공개로 유지할 수 있습니다. 프로젝트 공개 여부를 완전히 제어할 수 있습니다.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                <Layout className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">건설적인 피드백</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                인증된 대곽 학생들로부터 별점과 댓글을 받아 프로젝트를 지속적으로 발전시킬 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS PREVIEW */}
      <section className="py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">주목받는 프로젝트</h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">학우들이 최근에 개발한 놀라운 프로젝트들을 확인해보세요.</p>
          </div>
          <Link href="/explore" className={cn(buttonVariants({ variant: "ghost" }), "group rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20")}>
            전체 보기 <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_PROJECTS.map((project) => (
            <Link href={`/projects/${project.id}`} key={project.id} className="block">
              <Card className="group h-full rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer">
                <div className="h-48 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 opacity-50" />
                  <Terminal className="w-16 h-16 text-zinc-300 dark:text-zinc-700 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <Badge variant="secondary" className="bg-white/80 dark:bg-black/50 backdrop-blur-md">
                      {project.type}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pt-6">
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {project.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 rounded-full px-2">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mt-2">
                    {project.short_description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-500 mt-2">
                    <span className="flex items-center">
                      <Globe className="w-3.5 h-3.5 mr-1" />
                      {project.platforms.join(", ")}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 pb-5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {project.author.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{project.author}</span>
                  </div>
                  <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-zinc-300 dark:text-zinc-700 mr-1.5 group-hover:text-red-500 transition-colors">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {project.likes}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto py-12 px-6 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-black text-center text-zinc-500 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} DSHS Developer Platform. Built by students, for students.</p>
        <p className="mt-2 text-sm">오직 @ts.hs.kr 도메인 사용자만 인증을 통해 접속할 수 있습니다.</p>
      </footer>
    </div>
  );
}
