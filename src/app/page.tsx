export const revalidate = 30;

import Link from "next/link";
import { ArrowRight, Code2, Globe, Layout, Lightbulb, Megaphone, Search, Sparkles, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/shared/site-header";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { TipCard, type TipCardData } from "@/components/tips/tip-card";
import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { AnnouncementTicker, type TickerItem } from "@/components/shared/announcement-ticker";

type TipRowJoined = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  tags: string[];
  created_at: string;
  author: TipCardData["author"] | TipCardData["author"][] | null;
  tip_likes: { count: number }[];
  tip_comments: { count: number }[];
};

type IdeaRow = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
  created_at: string;
  author: { nickname: string | null; full_name: string | null } | null;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: "구현 요청 중", cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  in_progress: { label: "개발 중", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "완료", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: featuredProjects },
    { data: tipsRaw },
    { data: ideasRaw },
    { data: announcementsRaw },
  ] = await Promise.all([
    supabase
      .from("projects")
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
        users (*),
        reviews(rating)
      `)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ProjectCardData[]>(),
    supabase
      .from("tips")
      .select(
        `id, title, summary, cover_url, tags, created_at,
         author:users!tips_author_id_fkey(nickname, full_name, avatar_url),
         tip_likes(count), tip_comments(count)`,
      )
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<TipRowJoined[]>(),
    supabase
      .from("ideas")
      .select(
        `id, title, type, category, status, created_at,
         author:users!ideas_author_id_fkey(nickname, full_name)`,
      )
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<IdeaRow[]>(),
    supabase
      .from("announcements")
      .select("id, title, category, is_pinned")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<TickerItem[]>(),
  ]);

  const recentTips: TipCardData[] = (tipsRaw ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    summary: t.summary,
    cover_url: t.cover_url,
    tags: t.tags ?? [],
    created_at: t.created_at,
    author: Array.isArray(t.author) ? t.author[0] ?? null : t.author,
    likeCount: t.tip_likes?.[0]?.count ?? 0,
    commentCount: t.tip_comments?.[0]?.count ?? 0,
  }));

  const recentIdeas: IdeaRow[] = ideasRaw ?? [];
  const tickerItems: TickerItem[] = announcementsRaw ?? [];
  const hasTicker = tickerItems.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50 dark:bg-[#09090b] overflow-hidden font-sans">

      <SiteHeader variant="transparent" maxWidth="md" />

      {/* 공지사항 ticker — 헤더 아래 normal flow, 스크롤하면 사라짐 */}
      {hasTicker && (
        <div className="mt-16">
          <AnnouncementTicker items={tickerItems} />
        </div>
      )}

      {/* HERO SECTION */}
      <section className={cn(
        "relative pb-20 md:pb-32 px-4 sm:px-6 flex items-center justify-center flex-col text-center",
        hasTicker ? "pt-16 md:pt-32" : "pt-32 md:pt-48",
      )}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

        <Badge variant="outline" className="mb-6 py-1.5 px-4 backdrop-blur-md bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-sm">
          <Sparkles className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          DSHS Developer Platform에 오신 것을 환영합니다
        </Badge>

        <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-7xl font-bold tracking-normal text-zinc-900 dark:text-white mb-8 leading-snug break-keep">
          발견하고, 공유하고, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            새로움을 창조하세요.
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-[1.85] break-keep">
          대구과학고 학생들이 개발한 소프트웨어 프로젝트를 전시하고, 유용한 피드백을 주고받으며, 새로운 아이디어를 함께 발전시키는 중앙 허브입니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-none sm:w-auto z-10">
          {/* prefetch={true}: 홈에는 PageNav가 없으므로 force-dynamic 페이지를 명시적으로 프리패치 */}
          <Link href="/explore" prefetch={true} className={cn(buttonVariants({ size: "lg" }), "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105")}>
            <Search className="mr-2 h-5 w-5" /> 프로젝트 둘러보기
          </Link>
          <Link href="/projects/new" prefetch={true} className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:scale-105")}>
            <Code2 className="mr-2 h-5 w-5" /> 내 프로젝트 등록하기
          </Link>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS */}
      <section className="py-20 px-4 sm:px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4 leading-snug tracking-normal">학생들을 위해 만들어진 플랫폼</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-[1.85] break-keep">
              @ts.hs.kr 계정으로 안전하게 로그인하고 대곽 개발자들의 창의적인 세계에 빠져보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3 leading-snug">체계적인 포트폴리오</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                프로그램 종류, 지원 플랫폼, 라이선스별로 어플리케이션을 분류하여 누구나 필요한 프로그램을 쉽게 찾을 수 있습니다.
              </p>
            </div>
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3 leading-snug">오픈소스 & 클로즈드소스</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                커뮤니티에 코드 저장소를 공유하거나 비공개로 유지할 수 있습니다. 프로젝트 공개 여부를 완전히 제어할 수 있습니다.
              </p>
            </div>
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                <Layout className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3 leading-snug">건설적인 피드백</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                인증된 대곽 학생들로부터 별점과 댓글을 받아 프로젝트를 지속적으로 발전시킬 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS PREVIEW */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 leading-snug tracking-normal">최근 등록된 프로젝트</h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">친구들이 최근에 개발한 놀라운 프로젝트들을 확인해보세요.</p>
            </div>
            <Link href="/explore" className={cn(buttonVariants({ variant: "ghost" }), "group rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20")}>
              전체 보기 <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {featuredProjects && featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((project, index) => (
                <div key={project.id} className={index >= 3 ? "hidden sm:block" : ""}>
                  <ProjectCard project={project} mode="showcase" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400">아직 등록된 프로젝트가 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* RECENT TIPS */}
      <section className="py-20 px-4 sm:px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <Lightbulb className="h-4 w-4" /> 개발 팁
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2 leading-snug tracking-normal">최근 개발 팁</h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">친구들이 공유한 개발 노하우를 확인해보세요.</p>
            </div>
            <Link href="/tips" className={cn(buttonVariants({ variant: "ghost" }), "group rounded-full text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 shrink-0")}>
              전체 보기 <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {recentTips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400">아직 작성된 팁이 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* RECENT HAEJWO IDEAS */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                <Megaphone className="h-4 w-4" /> 해줘!
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2 leading-snug tracking-normal">최근 해줘! 아이디어</h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">개발자를 기다리는 아이디어들을 구경해보세요.</p>
            </div>
            <Link href="/haejwo" className={cn(buttonVariants({ variant: "ghost" }), "group rounded-full text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 shrink-0")}>
              전체 보기 <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {recentIdeas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentIdeas.map((idea) => {
                const typeName = PROJECT_TYPES.find((t) => t.value === idea.type)?.label ?? idea.type;
                const categoryName = FEATURES.find((f) => f.value === idea.category)?.label ?? idea.category;
                const status = STATUS_LABELS[idea.status] ?? STATUS_LABELS.open;
                const authorName = Array.isArray(idea.author)
                  ? (idea.author[0]?.nickname ?? idea.author[0]?.full_name ?? "익명")
                  : (idea.author?.nickname ?? idea.author?.full_name ?? "익명");
                const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: ko });

                return (
                  <Link
                    key={idea.id}
                    href={`/haejwo/${idea.id}`}
                    className="group flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-orange-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-orange-700"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {typeName}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {categoryName}
                      </span>
                      <span className={cn("ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", status.cls)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="line-clamp-2 font-semibold leading-snug text-zinc-900 group-hover:text-orange-700 dark:text-white dark:group-hover:text-orange-400">
                      {idea.title}
                    </p>
                    <div className="mt-auto flex items-center gap-2 text-xs text-zinc-400">
                      <span>{authorName}</span>
                      <span>·</span>
                      <span>{timeAgo}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400">아직 등록된 아이디어가 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto py-12 px-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-[#09090b] text-center text-zinc-500 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} DSHS Developer Platform. Built by students, for students.</p>
        <p className="mt-2 text-sm">오직 @ts.hs.kr 도메인 사용자만 인증을 통해 접속할 수 있습니다.</p>
      </footer>
    </div>
  );
}
