export const revalidate = 30;

import Link from "next/link";
import {
  ArrowRight,
  Rocket,
  Search,
  Sparkles,
  Shield,
  Lightbulb,
  TrendingUp,
  BookOpen,
  Newspaper,
  Megaphone,
  Bell,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/shared/site-header";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementTicker, type TickerItem } from "@/components/shared/announcement-ticker";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

const FEATURE_CARDS = [
  {
    href: "/explore",
    icon: Search,
    colorBg: "bg-blue-100 dark:bg-blue-900/40",
    colorIcon: "text-blue-600 dark:text-blue-400",
    colorLink: "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
    title: "모든 프로젝트 탐색",
    description: "검색과 필터로 대곽 학생들의 모든 프로그램을 한눈에 볼 수 있어요.",
  },
  {
    href: "/projects/new",
    icon: Rocket,
    colorBg: "bg-emerald-100 dark:bg-emerald-900/40",
    colorIcon: "text-emerald-600 dark:text-emerald-400",
    colorLink: "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
    title: "내 프로젝트 등록",
    description: "직접 만든 앱, 웹사이트, CLI 등을 등록하고 동료들에게 선보이세요.",
  },
  {
    href: "/guide",
    icon: BookOpen,
    colorBg: "bg-purple-100 dark:bg-purple-900/40",
    colorIcon: "text-purple-600 dark:text-purple-400",
    colorLink: "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300",
    title: "바이브 코딩 가이드",
    description: "개발 경험이 없어도 OK. 만들고 싶은 프로그램에 맞는 시작 가이드를 받아보세요.",
  },
  {
    href: "/tips",
    icon: Newspaper,
    colorBg: "bg-amber-100 dark:bg-amber-900/40",
    colorIcon: "text-amber-600 dark:text-amber-400",
    colorLink: "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300",
    title: "개발 팁 공유",
    description: "선배 개발자들의 실전 노하우와 꿀팁을 배우고, 내 지식도 나눠보세요.",
  },
  {
    href: "/haejwo",
    icon: Megaphone,
    colorBg: "bg-orange-100 dark:bg-orange-900/40",
    colorIcon: "text-orange-600 dark:text-orange-400",
    colorLink: "text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300",
    title: "해줘! 아이디어 요청",
    description: "아이디어는 있는데 개발 실력이 부족하다면? 개발자에게 직접 요청해보세요.",
  },
  {
    href: "/announcements",
    icon: Bell,
    colorBg: "bg-sky-100 dark:bg-sky-900/40",
    colorIcon: "text-sky-600 dark:text-sky-400",
    colorLink: "text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300",
    title: "공지사항",
    description: "프로젝트 홍보, 베타 테스트 모집, 업데이트 소식을 커뮤니티에 알려보세요.",
  },
] as const;

const VALUE_CARDS = [
  {
    icon: Shield,
    colorBg: "bg-blue-50 dark:bg-blue-950/40",
    colorBorder: "border-blue-100 dark:border-blue-900/50",
    colorIconBg: "bg-blue-100 dark:bg-blue-900/50",
    colorIcon: "text-blue-600 dark:text-blue-400",
    title: "안전한 공간",
    description:
      "@ts.hs.kr 계정만 인증 가능. 대구과학고 학생들만의 신뢰할 수 있는 공간에서 자유롭게 공유하세요.",
  },
  {
    icon: Lightbulb,
    colorBg: "bg-orange-50 dark:bg-orange-950/40",
    colorBorder: "border-orange-100 dark:border-orange-900/50",
    colorIconBg: "bg-orange-100 dark:bg-orange-900/50",
    colorIcon: "text-orange-600 dark:text-orange-400",
    title: "아이디어에서 구현으로",
    description:
      "비개발자도 아이디어를 올리면, 개발자가 실제로 만들어줄 수 있는 해줘! 기능이 있어요.",
  },
  {
    icon: TrendingUp,
    colorBg: "bg-emerald-50 dark:bg-emerald-950/40",
    colorBorder: "border-emerald-100 dark:border-emerald-900/50",
    colorIconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    colorIcon: "text-emerald-600 dark:text-emerald-400",
    title: "함께 성장하는 커뮤니티",
    description:
      "별점과 댓글로 피드백을 주고받고, 개발 팁을 공유하며 함께 실력을 키워나가요.",
  },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: announcementsRaw } = await supabase
    .from("announcements")
    .select("id, title, category, is_pinned")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<TickerItem[]>();

  const tickerItems: TickerItem[] = announcementsRaw ?? [];
  const hasTicker = tickerItems.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50/50 dark:bg-[#09090b] overflow-hidden font-sans">
      <SiteHeader variant="transparent" maxWidth="md" />

      {hasTicker && (
        <div className="mt-16">
          <AnnouncementTicker items={tickerItems} />
        </div>
      )}

      {/* HERO */}
      <section
        className={cn(
          "relative pb-20 md:pb-32 px-4 sm:px-6 flex items-center justify-center flex-col text-center",
          hasTicker ? "pt-16 md:pt-32" : "pt-32 md:pt-48"
        )}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
        <Badge
          variant="outline"
          className="mb-6 py-1.5 px-4 backdrop-blur-md bg-white/50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-sm"
        >
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
          대구과학고 학생들이 개발한 소프트웨어 프로젝트를 전시하고, 유용한 피드백을 주고받으며,
          새로운 아이디어를 함께 발전시키는 중앙 허브입니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-none sm:w-auto z-10">
          <Link
            href="/explore"
            prefetch={true}
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
            )}
          >
            <Search className="mr-2 h-5 w-5" /> 프로젝트 둘러보기
          </Link>
          <Link
            href="/projects/new"
            prefetch={true}
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:scale-105"
            )}
          >
            <Rocket className="mr-2 h-5 w-5" /> 내 프로젝트 등록하기
          </Link>
        </div>
      </section>

      {/* Section 1: 플랫폼의 모든 것 */}
      <section className="bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900 py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4 break-keep">
                플랫폼의 모든 것
              </h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400">
                대구과학고 학생들을 위한 6가지 핵심 기능
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURE_CARDS.map((card, index) => {
              const Icon = card.icon;
              return (
                <ScrollReveal key={card.href} delay={index * 80}>
                  <div className="group rounded-3xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-5 shrink-0",
                        card.colorBg
                      )}
                    >
                      <Icon className={cn("w-5 h-5", card.colorIcon)} />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                      {card.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed flex-1">
                      {card.description}
                    </p>
                    <Link
                      href={card.href}
                      className={cn(
                        "mt-5 inline-flex items-center gap-1 text-sm font-medium transition-colors",
                        card.colorLink
                      )}
                    >
                      바로 가기
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2: 왜 대곽 개발자 플랫폼인가? */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4 break-keep">
                왜 대곽 개발자 플랫폼인가?
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {VALUE_CARDS.map((card, index) => {
              const Icon = card.icon;
              return (
                <ScrollReveal key={card.title} delay={index * 100}>
                  <div
                    className={cn(
                      "rounded-3xl border p-8 flex flex-col items-center text-center",
                      card.colorBg,
                      card.colorBorder
                    )}
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                        card.colorIconBg
                      )}
                    >
                      <Icon className={cn("w-7 h-7", card.colorIcon)} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                      {card.title}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                      {card.description}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: CTA */}
      <section className="py-24 px-4 sm:px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-4 break-keep">
              지금 시작해보세요
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-10">
              @ts.hs.kr 계정으로 로그인하면 모든 기능을 이용할 수 있어요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-[280px] sm:max-w-none mx-auto">
              <Link
                href="/explore"
                prefetch={true}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                )}
              >
                <Search className="mr-2 h-5 w-5" /> 프로젝트 둘러보기
              </Link>
              <Link
                href="/projects/new"
                prefetch={true}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all hover:scale-105"
                )}
              >
                <Rocket className="mr-2 h-5 w-5" /> 내 프로젝트 등록하기
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <footer className="mt-auto py-12 px-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-[#09090b] text-center text-zinc-500 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} DSHS Developer Platform. Built by students, for students.</p>
        <p className="mt-2 text-sm">오직 @ts.hs.kr 도메인 사용자만 인증을 통해 접속할 수 있습니다.</p>
      </footer>
    </div>
  );
}
