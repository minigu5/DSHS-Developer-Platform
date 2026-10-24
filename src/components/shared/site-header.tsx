import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import { AuthButtons } from "@/components/shared/auth-buttons";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AnnouncementsLink } from "@/components/shared/announcements-link";
import { PageNav } from "@/components/shared/page-nav";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  maxWidth?: "sm" | "md" | "lg";
  variant?: "sticky" | "transparent";
  rightExtra?: ReactNode;
  showNav?: boolean;
}

const MAX_WIDTH_CLASS: Record<NonNullable<SiteHeaderProps["maxWidth"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
};

export function SiteHeader({
  maxWidth = "lg",
  variant = "sticky",
  rightExtra,
  showNav = false,
}: SiteHeaderProps) {
  const containerClass = cn(MAX_WIDTH_CLASS[maxWidth], "mx-auto px-6 h-16 flex items-center justify-between");

  return (
    <header
      className={cn(
        variant === "sticky"
          ? "sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
          : "absolute top-0 z-50 w-full",
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      <div className={containerClass}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <Image
              src="/logo.svg"
              alt=""
              width={32}
              height={32}
              className="block rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0"
            />
            {/* 공식 이름은 영문(도메인과 일치), 읽는 이름 "대곽 개발자 플랫폼"을 아래 작은 글씨로 병기 */}
            <span className="flex flex-col gap-px">
              <span className="font-heading font-bold text-base sm:text-[17px] leading-[1.1] tracking-tight text-zinc-900 dark:text-white">
                DSHS Developer Platform
              </span>
              <span className="text-[11px] leading-[1.1] font-medium text-zinc-600 dark:text-zinc-400">
                대곽 개발자 플랫폼
              </span>
            </span>
          </Link>
          {showNav && (
            <>
              <div className="hidden sm:block w-px h-5 bg-zinc-200 dark:bg-zinc-800 shrink-0" aria-hidden />
              <div className="hidden sm:block">
                <PageNav />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {rightExtra}
          {/* 모바일은 헤더가 좁아 다크모드 토글을 프로필 메뉴로 옮긴다(auth-buttons.tsx) */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <AnnouncementsLink />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
