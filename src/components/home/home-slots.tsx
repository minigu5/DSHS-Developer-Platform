"use client";

import Link from "@/components/shared/link";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { AnnouncementTicker } from "@/components/shared/announcement-ticker";
import { ClosingCta } from "@/components/home/closing-cta";
import { DomainTeaser } from "@/components/home/domain-teaser";
import { useHomeData } from "@/components/home/home-data";
import { HomeProjectCard } from "@/components/home/home-project-card";
import { HowItWorks } from "@/components/home/how-it-works";
import { IconShelf, SHELF_LIMIT } from "@/components/home/icon-shelf";
import { RecentPosts } from "@/components/home/recent-posts";

// 홈 섹션 중 DB 데이터가 필요한 부분. 데이터는 브라우저가 읽고(home-data.ts), 받기 전에는 같은 크기의 회색 자리를 둔다.

// 스크롤 리빌 차례 — 같은 줄의 n번째 카드는 n×90ms 늦게 재생
const revealOrder = (n: number) => ({ "--reveal-delay": `${n * 90}ms` }) as CSSProperties;

const BLOCK = "bg-zinc-100 dark:bg-zinc-800/70";

/** 공지 띠 — 받는 동안·공지가 없을 때도 띠 높이만큼 자리를 잡아 둬서 히어로가 밀리지 않는다. */
export function TickerSlot() {
  const data = useHomeData();
  if (data && data.ticker.length === 0) return <div aria-hidden className="mt-16 h-7" />;
  return (
    <aside aria-label="최근 공지사항" className="mt-16">
      {data ? <AnnouncementTicker items={data.ticker} /> : <div className="h-7 border-b border-zinc-200 dark:border-zinc-800" />}
    </aside>
  );
}

/** 히어로 아이콘 나열 — 받는 동안 같은 크기의 빈 칸 12개. */
export function ShelfSlot() {
  const data = useHomeData();
  if (data) return <IconShelf projects={data.shelf} />;
  return (
    <ul aria-hidden className="flex flex-wrap justify-center gap-3.5">
      {Array.from({ length: SHELF_LIMIT + 1 }).map((_, i) => (
        <li key={i} className={cn("h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-[22%]", BLOCK)} />
      ))}
    </ul>
  );
}

export function RecentProjectsSlot() {
  const data = useHomeData();

  if (!data) {
    return (
      <ul aria-hidden className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className={cn("h-[150px] rounded-[20px]", BLOCK, i >= 3 && "hidden sm:block")} />
        ))}
      </ul>
    );
  }

  if (data.recentProjects.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">아직 공개된 프로젝트가 없어요.</p>
        <Link
          href="/projects/new"
          className="mt-3 inline-block text-sm font-medium text-blue-700 dark:text-blue-400 underline underline-offset-4"
        >
          첫 프로젝트 등록하기
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {data.recentProjects.map((project, index) => (
        <li key={project.id} className={cn("reveal", index >= 3 && "hidden sm:block")} style={revealOrder(index % 3)}>
          <HomeProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}

export function HowItWorksSlot() {
  const data = useHomeData();
  return <HowItWorks examples={data ? data.examples : null} />;
}

export function RecentPostsSlot() {
  const data = useHomeData();
  if (!data) {
    return (
      <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-[280px] rounded-[20px]", BLOCK)} />
        ))}
      </div>
    );
  }
  return <RecentPosts tips={data.tips} ideas={data.ideas} announcements={data.recentAnnouncements} />;
}

/** 사용 현황 줄은 받은 뒤에만(3개 미만이면 DomainTeaser가 숨긴다). */
export function DomainTeaserSlot() {
  const data = useHomeData();
  return <DomainTeaser showcase={data?.showcase ?? null} />;
}

export function ClosingCtaSlot() {
  const data = useHomeData();
  return <ClosingCta projects={data?.shelf ?? []} />;
}
