export const revalidate = 60;

import Link from "next/link";
import { ArrowRight, Code2, Globe, Layout, Lightbulb, Search, Sparkles, Layers } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/shared/site-header";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";

export default async function HomePage() {
  const supabase = await createClient();
  
  // Fetch up to 6 featured (latest) projects
  const { data: featuredProjects } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      short_description,
      type,
      platforms,
      author_role,
      team_name,
      icon_url,
      features,
      author_id,
      users (*)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(6)
    .returns<ProjectCardData[]>();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50 dark:bg-[#09090b] overflow-hidden font-sans">
      
      <SiteHeader variant="transparent" maxWidth="md" />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 sm:px-6 flex items-center justify-center flex-col text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

        <Badge variant="outline" className="mb-6 py-1.5 px-4 backdrop-blur-md bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-sm">
          <Sparkles className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          DSHS Developer Platform에 오신 것을 환영합니다
        </Badge>
        
        <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-8 leading-tight break-keep">
          발견하고, 공유하고, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            새로움을 창조하세요.
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed break-keep">
          대구과학고 학생들이 개발한 소프트웨어 프로젝트를 전시하고, 유용한 피드백을 주고받으며, 새로운 아이디어를 함께 발전시키는 중앙 허브입니다.
        </p>
        
        <div className="flex flex-col items-center sm:flex-row sm:flex-wrap sm:items-stretch gap-3 sm:gap-4 w-full sm:w-auto z-10">
          <Link href="/explore" className={cn(buttonVariants({ size: "lg" }), "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105")}>
            <Search className="mr-2 h-5 w-5" /> 프로젝트 둘러보기
          </Link>
          <Link href="/projects/new" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:scale-105")}>
            <Code2 className="mr-2 h-5 w-5" /> 내 프로젝트 등록하기
          </Link>
          <Link href="/guide" className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:scale-105")}>
            <Sparkles className="mr-2 h-5 w-5" /> 바이브 코딩 가이드
          </Link>
          <Link href="/tips" className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:scale-105")}>
            <Lightbulb className="mr-2 h-5 w-5" /> 개발 팁
          </Link>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS */}
      <section className="py-20 px-4 sm:px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">학생들을 위해 만들어진 플랫폼</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg break-keep">
              @ts.hs.kr 계정으로 안전하게 로그인하고 대곽 개발자들의 창의적인 세계에 빠져보세요.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">체계적인 포트폴리오</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                프로그램 종류, 지원 플랫폼, 라이선스별로 어플리케이션을 분류하여 누구나 필요한 프로그램을 쉽게 찾을 수 있습니다.
              </p>
            </div>
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">오픈소스 & 클로즈드소스</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                커뮤니티에 코드 저장소를 공유하거나 비공개로 유지할 수 있습니다. 프로젝트 공개 여부를 완전히 제어할 수 있습니다.
              </p>
            </div>
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
      <section className="py-24 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">최근 등록된 프로젝트</h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">친구들이 최근에 개발한 놀라운 프로젝트들을 확인해보세요.</p>
          </div>
          <Link href="/explore" className={cn(buttonVariants({ variant: "ghost" }), "group rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20")}>
            전체 보기 <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {featuredProjects && featuredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} mode="showcase" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400">아직 등록된 프로젝트가 없습니다.</p>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="mt-auto py-12 px-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-[#09090b] text-center text-zinc-500 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} DSHS Developer Platform. Built by students, for students.</p>
        <p className="mt-2 text-sm">오직 @ts.hs.kr 도메인 사용자만 인증을 통해 접속할 수 있습니다.</p>
      </footer>
    </div>
  );
}
