export const revalidate = 30;

import type { CSSProperties } from "react";
import Link from "next/link";
import { Search, Rocket, BookOpen, Newspaper, Megaphone, Bell, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/shared/site-header";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementTicker, type TickerItem } from "@/components/shared/announcement-ticker";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { PeriodicTable, TABLE_CAPACITY, type TableProject } from "@/components/home/periodic-table";
import { FeaturedProject, type FeaturedProjectData } from "@/components/home/featured-project";

// 프로젝트 외 메뉴 — 아이콘 타일 색은 PageNav 의 섹션 색과 동일하게 맞춤
const SECTION_LINKS = [
  {
    href: "/guide",
    icon: BookOpen,
    tileClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    title: "나도 개발해볼래!",
    description: "만들고 싶은 프로그램과 쓰는 컴퓨터를 고르면 시작 방법을 단계별로 알려줘요.",
  },
  {
    href: "/tips",
    icon: Newspaper,
    tileClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    title: "개발 팁",
    description: "직접 부딪혀 알게 된 개발 노하우를 글로 남기고 읽어요.",
  },
  {
    href: "/haejwo",
    icon: Megaphone,
    tileClass: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    title: "해줘!",
    description: "있으면 좋겠는 프로그램을 올리면, 만들 수 있는 사람이 가져가요.",
  },
  {
    href: "/announcements",
    icon: Bell,
    tileClass: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    title: "공지사항",
    description: "베타 테스터 모집, 업데이트 소식, 의견 요청을 올리는 게시판이에요.",
  },
] as const;

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: announcementsRaw }, { data: projectsRaw }, { data: tableRaw }, { data: featuredRaw }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, category, is_pinned")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<TickerItem[]>(),
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
          users (full_name, nickname, avatar_url),
          reviews(rating)
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<ProjectCardData[]>(),
      // 주기율표: 등록 순. 마지막 칸은 "내 앱 올리기"라 TABLE_CAPACITY 개까지만
      supabase
        .from("projects")
        .select("id, title, icon_url, type")
        .eq("visibility", "public")
        .order("created_at", { ascending: true })
        .limit(TABLE_CAPACITY)
        .returns<TableProject[]>(),
      // 1등 카드: 방문 수 1위(동률이면 최신 등록 우선)
      supabase
        .from("projects")
        .select(`
          id,
          title,
          short_description,
          icon_url,
          click_count,
          author_id,
          author_role,
          team_name,
          users (full_name, nickname, avatar_url)
        `)
        .eq("visibility", "public")
        .order("click_count", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<FeaturedProjectData[]>(),
    ]);

  const tickerItems: TickerItem[] = announcementsRaw ?? [];
  const hasTicker = tickerItems.length > 0;
  const recentProjects: ProjectCardData[] = projectsRaw ?? [];
  const tableProjects: TableProject[] = tableRaw ?? [];
  const featured: FeaturedProjectData | null = featuredRaw?.[0] ?? null;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
      <SiteHeader variant="transparent" maxWidth="md" />

      {hasTicker && (
        <aside aria-label="최근 공지사항" className="mt-16">
          <AnnouncementTicker items={tickerItems} />
        </aside>
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* HERO — 왼쪽 소개, 오른쪽 프로젝트 주기율표. 모눈종이 배경 + 로드 시 한 번의 등장 시퀀스 */}
        <section
          className={cn(
            "paper-grid border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 pb-16 sm:pb-20",
            hasTicker ? "pt-12 sm:pt-16" : "pt-28 sm:pt-32"
          )}
        >
          <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_616px] lg:items-center lg:gap-12">
            <div>
              <h1 className="rise max-w-md text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white leading-[1.15] break-keep">
                대곽에서 만든 프로그램은 여기 다 모여요
              </h1>
              <p
                className="rise mt-5 max-w-md text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep"
                style={riseDelay(90)}
              >
                친구가 만든 웹사이트와 앱을 써 보고 리뷰를 남겨요. 내가 만든 프로그램도 올려서 피드백을 받아요.
              </p>
              <div
                className="rise mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-[280px] sm:max-w-none"
                style={riseDelay(180)}
              >
                <Link
                  href="/explore"
                  prefetch={true}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 px-5 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.96] transition-[background-color,scale]"
                  )}
                >
                  <Search className="mr-2 h-4 w-4" aria-hidden />
                  프로젝트 둘러보기
                </Link>
                <Link
                  href="/projects/new"
                  prefetch={true}
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-11 px-5 text-sm sm:text-base border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-[background-color,scale]"
                  )}
                >
                  <Rocket className="mr-2 h-4 w-4" aria-hidden />
                  내 프로젝트 등록하기
                </Link>
              </div>
            </div>

            <div className="mt-12 lg:mt-0">
              <h2 className="sr-only">등록된 프로젝트</h2>
              <PeriodicTable projects={tableProjects} />
            </div>
          </div>
        </section>

        {/* 가장 많이 열어본 프로젝트 */}
        {featured && (featured.click_count ?? 0) >= 1 && (
          <section aria-labelledby="featured-title" className="px-4 sm:px-6 pt-16 sm:pt-20 pb-16 sm:pb-20">
            <div className="max-w-5xl mx-auto">
              <FeaturedProject project={featured} />
            </div>
          </section>
        )}

        {/* 최근 프로젝트 */}
        <section aria-labelledby="recent-projects" className={cn("px-4 sm:px-6 pb-20", !featured && "pt-16 sm:pt-20")}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6">
              <h2 id="recent-projects" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                최근 올라온 프로젝트
              </h2>
              <Link
                href="/explore"
                className="inline-flex items-center text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                전체 보기
                <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
              </Link>
            </div>

            {recentProjects.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {recentProjects.map((project, index) => (
                  <li key={project.id} className={cn(index >= 3 && "hidden sm:block")}>
                    <ProjectCard project={project} mode="showcase" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">아직 공개된 프로젝트가 없어요.</p>
                <Link
                  href="/projects/new"
                  className="mt-3 inline-block text-sm font-medium text-blue-700 dark:text-blue-400 underline underline-offset-4"
                >
                  첫 프로젝트 등록하기
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 다른 메뉴 */}
        <section
          aria-labelledby="more-sections"
          className="px-4 sm:px-6 py-16 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800"
        >
          <div className="max-w-5xl mx-auto">
            <h2 id="more-sections" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-6">
              프로젝트 말고도
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SECTION_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex h-full flex-col gap-3.5 rounded-[20px] border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", item.tileClass)} aria-hidden>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-zinc-900 dark:text-white">{item.title}</span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 break-keep">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      <footer className="py-10 px-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-2 sm:justify-between">
          <p>© {new Date().getFullYear()} DSHS Developer Platform</p>
          <p>대구과학고 @ts.hs.kr 계정으로 로그인할 수 있어요.</p>
        </div>
      </footer>
    </div>
  );
}
