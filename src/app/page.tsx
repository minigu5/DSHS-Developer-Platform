export const revalidate = 30;

import type { CSSProperties } from "react";
import Link from "next/link";
import { Search, Rocket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { projectTypeLabels } from "@/lib/constants";
import { SiteHeader } from "@/components/shared/site-header";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementTicker, type TickerItem } from "@/components/shared/announcement-ticker";
import type { ProjectCardData } from "@/components/projects/project-card";
import { IconShelf, SHELF_LIMIT, type ShelfProject } from "@/components/home/icon-shelf";
import { RevealObserver } from "@/components/home/reveal-observer";
import { SectionHeader } from "@/components/home/section-header";
import { HomeProjectCard } from "@/components/home/home-project-card";
import { HowItWorks, type HowItWorksExamples } from "@/components/home/how-it-works";
import { RecentPosts, type RecentTip, type RecentIdea } from "@/components/home/recent-posts";
import { GuideTeaser } from "@/components/home/guide-teaser";
import { ClosingCta } from "@/components/home/closing-cta";
import { SiteFooter } from "@/components/home/site-footer";

type Person = { nickname: string | null; full_name: string | null } | null;
type TipJoined = {
  id: string;
  title: string;
  cover_url: string | null;
  author: Person;
  tip_likes: { count: number }[] | null;
  tip_comments: { count: number }[] | null;
};
type IdeaJoined = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: "open" | "in_progress" | "done";
  author: Person;
};
type ReviewJoined = {
  comment: string;
  rating: number | null;
  users: Person;
  projects: { title: string; icon_url: string | null } | null;
};

const personName = (p: Person, fallback = "알 수 없음") => p?.nickname || p?.full_name || fallback;
const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;
// 스크롤 리빌 차례 — 같은 줄의 n번째 카드는 n×90ms 늦게 재생
const revealOrder = (n: number) => ({ "--reveal-delay": `${n * 90}ms` }) as CSSProperties;

const IDEA_STATUS_LABEL: Record<IdeaJoined["status"], string> = {
  open: "구현 요청 중",
  in_progress: "개발 중",
  done: "구현 완료",
};

export default async function HomePage() {
  const supabase = await createClient();
  const [
    { data: announcementsRaw },
    { data: projectsRaw },
    { data: shelfRaw },
    { data: tipsRaw },
    { data: ideasRaw },
    { data: reviewRaw },
  ] = await Promise.all([
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
        types,
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
    // 아이콘 나열: 많이 찾는 순(동률이면 최신 등록 우선) 11개 + "내 앱 올리기" 칸
    supabase
      .from("projects")
      .select("id, title, icon_url")
      .eq("visibility", "public")
      .order("click_count", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(SHELF_LIMIT)
      .returns<ShelfProject[]>(),
    supabase
      .from("tips")
      .select("id, title, cover_url, author:users!tips_author_id_fkey(nickname, full_name), tip_likes(count), tip_comments(count)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<TipJoined[]>(),
    supabase
      .from("ideas")
      .select("id, title, type, category, status, author:users!ideas_author_id_fkey(nickname, full_name)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<IdeaJoined[]>(),
    // "이렇게 써요" 2단계 예시 — 공개 프로젝트에 달린 가장 최근 리뷰 한 개
    supabase
      .from("reviews")
      .select("comment, rating, users(nickname, full_name), projects!inner(title, icon_url)")
      .eq("projects.visibility", "public")
      .neq("comment", "")
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<ReviewJoined[]>(),
  ]);

  const tickerItems: TickerItem[] = announcementsRaw ?? [];
  const hasTicker = tickerItems.length > 0;
  const recentProjects: ProjectCardData[] = projectsRaw ?? [];
  const shelfProjects: ShelfProject[] = shelfRaw ?? [];

  const tips: RecentTip[] = (tipsRaw ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    cover_url: t.cover_url,
    authorName: personName(t.author),
    likeCount: t.tip_likes?.[0]?.count ?? 0,
    commentCount: t.tip_comments?.[0]?.count ?? 0,
  }));
  const ideas: RecentIdea[] = (ideasRaw ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    category: i.category,
    status: i.status,
    authorName: personName(i.author),
  }));
  const recentAnnouncements = tickerItems.slice(0, 4);

  const latest = recentProjects[0];
  const latestUser = latest ? (Array.isArray(latest.users) ? latest.users[0] : latest.users) : null;
  const review = reviewRaw?.[0];
  const examples: HowItWorksExamples = {
    latestProject: latest
      ? {
          title: latest.title,
          icon_url: latest.icon_url,
          authorName: latest.author_role === "team" && latest.team_name ? `${latest.team_name} 팀` : personName(latestUser),
          typeLabel: projectTypeLabels(latest.types, true).join(" · "),
        }
      : null,
    latestReview:
      review && review.projects
        ? {
            comment: review.comment,
            rating: review.rating,
            reviewerName: personName(review.users),
            projectTitle: review.projects.title,
            projectIcon: review.projects.icon_url,
          }
        : null,
    latestIdea: ideas[0] ? { title: ideas[0].title, statusLabel: IDEA_STATUS_LABEL[ideas[0].status] } : null,
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
      <SiteHeader variant="transparent" maxWidth="md" />
      <RevealObserver />

      {hasTicker && (
        <aside aria-label="최근 공지사항" className="mt-16">
          <AnnouncementTicker items={tickerItems} />
        </aside>
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* HERO — 가운데 정렬 세로 스택(모바일에서도 같은 구조). 모눈종이 배경 + 로드 시 한 번의 등장 시퀀스 */}
        <section
          className={cn(
            "paper-grid border-b border-zinc-200 dark:border-zinc-800 px-6 pb-16 sm:pb-20",
            hasTicker ? "pt-14 sm:pt-24" : "pt-28 sm:pt-40"
          )}
        >
          <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
            <h1 className="rise text-3xl sm:text-6xl font-bold text-zinc-900 dark:text-white leading-[1.2] break-keep">
              <span className="block">발견하고, 공유하고,</span>
              <span className="block text-blue-600 dark:text-blue-400">만들어요.</span>
            </h1>
            <p
              className="rise mt-6 max-w-2xl text-base sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep"
              style={riseDelay(90)}
            >
              친구가 만든 웹사이트와 앱을 써 보고 리뷰를 남겨요. 내가 만든 프로그램도 올려서 피드백을 받아요.
            </p>
            <div
              className="rise mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-[280px] sm:max-w-none sm:w-auto"
              style={riseDelay(180)}
            >
              <Link
                href="/explore"
                prefetch={true}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 px-7 rounded-full text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.96] transition-[background-color,scale]"
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
                  "h-12 px-7 rounded-full text-sm sm:text-base border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-[background-color,scale]"
                )}
              >
                <Rocket className="mr-2 h-4 w-4" aria-hidden />
                내 프로젝트 등록하기
              </Link>
            </div>

            <div className="mt-14 sm:mt-16 w-full max-w-[616px]">
              <h2 className="sr-only">많이 찾는 프로젝트</h2>
              <IconShelf projects={shelfProjects} />
            </div>
          </div>
        </section>

        {/* 최근 프로젝트 */}
        <section aria-labelledby="recent-projects" className="px-6 pt-14 pb-14 sm:pt-20 sm:pb-20">
          <div className="max-w-5xl mx-auto">
            <SectionHeader id="recent-projects" title="최근 올라온 프로젝트" description="새로 등록된 순서예요." moreHref="/explore" />
            {recentProjects.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {recentProjects.map((project, index) => (
                  <li
                    key={project.id}
                    className={cn("reveal", index >= 3 && "hidden sm:block")}
                    style={revealOrder(index % 3)}
                  >
                    <HomeProjectCard project={project} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[20px] border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
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

        {/* 이렇게 써요 */}
        <section aria-labelledby="how-it-works" className="px-6 py-14 sm:py-16 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto">
            <SectionHeader id="how-it-works" title="이렇게 써요" description="학교 계정으로 로그인하면 바로 할 수 있는 세 가지." />
            <HowItWorks examples={examples} />
          </div>
        </section>

        {/* 요즘 올라온 글 */}
        <section aria-labelledby="recent-posts" className="px-6 py-14 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <SectionHeader id="recent-posts" title="요즘 올라온 글" description="프로젝트 말고도 글이 올라와요." />
            <RecentPosts tips={tips} ideas={ideas} announcements={recentAnnouncements} />
          </div>
        </section>

        {/* 직접 만들어 보고 싶다면 */}
        <section aria-labelledby="guide-teaser" className="px-6 py-14 sm:py-16 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto">
            <h2 id="guide-teaser" className="sr-only">직접 만들어 보고 싶다면</h2>
            <GuideTeaser />
          </div>
        </section>

        {/* 마무리 한 번 더 */}
        <section aria-labelledby="closing-cta" className="px-6 py-14 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <ClosingCta projects={shelfProjects} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
