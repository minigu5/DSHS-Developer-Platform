import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import { AuthButtons } from "@/components/shared/auth-buttons";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
  const containerClass = cn(MAX_WIDTH_CLASS[maxWidth], "mx-auto px-4 sm:px-6 h-16 flex items-center justify-between");

  return (
    <header
      className={cn(
        variant === "sticky"
          ? "sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md"
          : "absolute top-0 z-50 w-full",
      )}
    >
      <div className={containerClass}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80 shrink-0">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
              <Image src="/logo.svg" alt="Logo" fill className="object-cover" />
            </div>
            <h1 className="font-bold text-lg text-zinc-900 dark:text-white">
              <span className="hidden sm:inline">DSHS Developer Platform</span>
              <span className="sm:hidden">대곽 개발자 플랫폼</span>
            </h1>
          </Link>
          {showNav && (
            <>
              <div className="hidden sm:block w-px h-5 bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="hidden sm:block">
                <PageNav />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {rightExtra}
          <ThemeToggle />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
