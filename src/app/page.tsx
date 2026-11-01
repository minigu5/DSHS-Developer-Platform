// 빌드 때 한 번 그려 두는 정적 페이지 — 요청마다 서버가 그리면 Cloudflare Workers 무료 요금제의 CPU 한도(요청당 10ms)를 넘겨 503이 났다.
// 목록 데이터(공지·프로젝트·글·리뷰·도메인 현황)는 모두 공개 데이터라 브라우저가 읽는다 — home-slots.tsx / home-data.ts.
export const dynamic = "force-static";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Search, Rocket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/shared/site-header";
import { MobileNav } from "@/components/shared/page-nav";
import { RevealObserver } from "@/components/home/reveal-observer";
import { SectionHeader } from "@/components/home/section-header";
import { GuideTeaser } from "@/components/home/guide-teaser";
import { SiteFooter } from "@/components/home/site-footer";
import {
  ClosingCtaSlot,
  DomainTeaserSlot,
  HowItWorksSlot,
  RecentPostsSlot,
  RecentProjectsSlot,
  ShelfSlot,
  TickerSlot,
} from "@/components/home/home-slots";

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
      <SiteHeader variant="transparent" maxWidth="md" showNav />
      <RevealObserver />

      <TickerSlot />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* HERO — 가운데 정렬 세로 스택(모바일에서도 같은 구조). 모눈종이 배경 + 로드 시 한 번의 등장 시퀀스 */}
        <section className="paper-grid border-b border-zinc-200 dark:border-zinc-800 px-6 pt-14 pb-16 sm:pt-24 sm:pb-20">
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
              <ShelfSlot />
            </div>
          </div>
        </section>

        {/* 최근 프로젝트 */}
        <section aria-labelledby="recent-projects" className="px-6 pt-14 pb-14 sm:pt-20 sm:pb-20">
          <div className="max-w-5xl mx-auto">
            <SectionHeader id="recent-projects" title="최근 올라온 프로젝트" description="새로 등록된 순서예요." moreHref="/explore" />
            <RecentProjectsSlot />
          </div>
        </section>

        {/* 이렇게 써요 */}
        <section aria-labelledby="how-it-works" className="px-6 py-14 sm:py-16 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto">
            <SectionHeader id="how-it-works" title="이렇게 써요" description="학교 계정으로 로그인하면 바로 할 수 있는 세 가지." />
            <HowItWorksSlot />
          </div>
        </section>

        {/* 요즘 올라온 글 */}
        <section aria-labelledby="recent-posts" className="px-6 py-14 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <SectionHeader id="recent-posts" title="요즘 올라온 글" description="프로젝트 말고도 글이 올라와요." />
            <RecentPostsSlot />
          </div>
        </section>

        {/* 직접 만들어 보고 싶다면 */}
        <section aria-labelledby="guide-teaser" className="px-6 py-14 sm:py-16 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto">
            <h2 id="guide-teaser" className="sr-only">직접 만들어 보고 싶다면</h2>
            <div className="grid gap-4 sm:gap-5">
              <GuideTeaser />
              <DomainTeaserSlot />
            </div>
          </div>
        </section>

        {/* 마무리 한 번 더 */}
        <section aria-labelledby="closing-cta" className="px-6 py-14 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <ClosingCtaSlot />
          </div>
        </section>
      </main>

      <div className="pb-16 sm:pb-0">
        <SiteFooter />
      </div>
      <MobileNav />
    </div>
  );
}
