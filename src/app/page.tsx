export const revalidate = 30;

import Link from "next/link";
import { Search, Rocket, BookOpen, Newspaper, Megaphone, Bell, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/shared/site-header";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementTicker, type TickerItem } from "@/components/shared/announcement-ticker";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { AppShelf, type ShelfApp } from "@/components/home/app-shelf";

// 프로젝트 외 메뉴 — 아이콘 색은 PageNav 의 섹션 색과 동일하게 맞춤
const SECTION_LINKS = [
  {
    href: "/guide",
    icon: BookOpen,
    iconClass: "text-purple-600 dark:text-purple-400",
    title: "나도 개발해볼래!",
    description: "만들고 싶은 프로그램과 쓰는 컴퓨터를 고르면 시작 방법을 단계별로 알려줘요.",
  },
  {
    href: "/tips",
    icon: Newspaper,
    iconClass: "text-amber-600 dark:text-amber-400",
    title: "개발 팁",
    description: "직접 부딪혀 알게 된 개발 노하우를 글로 남기고 읽어요.",
  },
  {
    href: "/haejwo",
    icon: Megaphone,
    iconClass: "text-orange-600 dark:text-orange-400",
    title: "해줘!",
    description: "있으면 좋겠는 프로그램을 올리면, 만들 수 있는 사람이 가져가요.",
  },
  {
    href: "/announcements",
    icon: Bell,
    iconClass: "text-sky-600 dark:text-sky-400",
    title: "공지사항",
    description: "베타 테스터 모집, 업데이트 소식, 의견 요청을 올리는 게시판이에요.",
  },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: announcementsRaw }, { data: projectsRaw }, { data: shelfRaw }, { count: projectCount }] = await Promise.all([
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
    // 진열대: 방문 많은 순 11개 + "내 앱 올리기" 칸 = 4열 × 3줄
    supabase
      .from("projects")
      .select("id, title, icon_url")
      .eq("visibility", "public")
      .order("click_count", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(11)
      .returns<ShelfApp[]>(),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("visibility", "public"),
  ]);

  const tickerItems: TickerItem[] = announcementsRaw ?? [];
  const hasTicker = tickerItems.length > 0;
  const recentProjects: ProjectCardData[] = projectsRaw ?? [];
  const shelfApps: ShelfApp[] = shelfRaw ?? [];
  const totalProjects = projectCount ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <SiteHeader variant="transparent" maxWidth="md" />

      {hasTicker && (
        <aside aria-label="최근 공지사항" className="mt-16">
          <AnnouncementTicker items={tickerItems} />
        </aside>
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* HERO — 왼쪽 소개, 오른쪽 실제 프로젝트 아이콘 진열대 */}
        <section
          className={cn(
            "px-4 sm:px-6 pb-16 sm:pb-20",
            hasTicker ? "pt-12 sm:pt-20" : "pt-28 sm:pt-36"
          )}
        >
          <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-14">
            <div>
              <h1 className="max-w-xl text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white leading-[1.2] break-keep">
                {totalProjects > 0
                  ? `대구과학고 학생들이 만든 프로그램 ${totalProjects}개`
                  : "대구과학고 학생들이 만든 프로그램을 모으고 있어요"}
              </h1>
              <p className="mt-5 max-w-lg text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                친구가 만든 웹사이트와 앱을 써 보고 리뷰를 남겨 보세요. 직접 만든 프로그램이 있다면 올려서
                피드백을 받을 수 있어요.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-[280px] sm:max-w-none">
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

            <div className="mt-12 lg:mt-0 max-w-[400px]">
              <h2 className="sr-only">많이 찾는 프로젝트</h2>
              <AppShelf apps={shelfApps} />
            </div>
          </div>
        </section>

        {/* 최근 프로젝트 */}
        <section aria-labelledby="recent-projects" className="px-4 sm:px-6 pb-20">
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
          className="px-4 sm:px-6 py-16 bg-white dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800"
        >
          <div className="max-w-5xl mx-auto">
            <h2 id="more-sections" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-6">
              프로젝트 말고도
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 border-t border-zinc-200 dark:border-zinc-800">
              {SECTION_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.href}
                    className="border-b border-zinc-200 dark:border-zinc-800 md:odd:border-r md:odd:pr-6 md:even:pl-6"
                  >
                    <Link
                      href={item.href}
                      className="group flex items-start gap-4 py-5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", item.iconClass)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-zinc-900 dark:text-white group-hover:underline underline-offset-4">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                        aria-hidden
                      />
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
