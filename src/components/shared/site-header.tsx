import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { AuthButtons } from "@/components/shared/auth-buttons";
import { BackButton } from "@/components/shared/back-button";
import { cn } from "@/lib/utils";

type BackConfig =
  | { type: "home" }
  | { type: "custom"; href: string; label: string }
  | { type: "history"; fallbackUrl?: string };

interface SiteHeaderProps {
  maxWidth?: "sm" | "md" | "lg";
  variant?: "sticky" | "transparent";
  back?: BackConfig;
  showLogo?: boolean;
  pageTitle?: string;
  rightExtra?: ReactNode;
}

const MAX_WIDTH_CLASS: Record<NonNullable<SiteHeaderProps["maxWidth"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
};

function BackSlot({ back }: { back: BackConfig }) {
  if (back.type === "home") {
    return (
      <Link
        href="/"
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> 홈으로
      </Link>
    );
  }
  if (back.type === "custom") {
    return (
      <Link
        href={back.href}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> {back.label}
      </Link>
    );
  }
  return <BackButton fallbackUrl={back.fallbackUrl} />;
}

export function SiteHeader({
  maxWidth = "lg",
  variant = "sticky",
  back,
  showLogo = false,
  pageTitle,
  rightExtra,
}: SiteHeaderProps) {
  const containerClass = cn(MAX_WIDTH_CLASS[maxWidth], "mx-auto px-6 h-16 flex items-center justify-between");

  return (
    <header
      className={cn(
        variant === "sticky"
          ? "sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md"
          : "absolute top-0 z-50 w-full",
      )}
    >
      <div className={containerClass}>
        <div className="flex items-center gap-4 min-w-0">
          {back && <BackSlot back={back} />}
          {showLogo && (
            <h1 className="font-bold text-lg hidden sm:block">
              DSHS Developer Platform
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4">
          {pageTitle && (
            <div className="text-sm font-medium text-zinc-500 hidden sm:block">
              {pageTitle}
            </div>
          )}
          {rightExtra}
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
