"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Rocket, BookOpen, Newspaper, Megaphone, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

// 알약 색은 섹션 색 맵(src/lib/section-colors.ts)과 공유 — 페이지 머리 타일·주 버튼과 같은 색
const NAV_ITEMS = [
  { href: "/explore", label: "모든 프로젝트", icon: Search, pillClass: SECTION_COLORS.explore.pill },
  { href: "/projects/new", label: "프로젝트 등록", icon: Rocket, pillClass: SECTION_COLORS.new.pill },
  { href: "/guide", label: "나도 개발해볼래!", icon: BookOpen, pillClass: SECTION_COLORS.guide.pill },
  { href: "/tips", label: "개발 팁", icon: Newspaper, pillClass: SECTION_COLORS.tips.pill },
  { href: "/haejwo", label: "해줘!", icon: Megaphone, pillClass: SECTION_COLORS.haejwo.pill },
  { href: "/announcements", label: "공지사항", icon: Bell, pillClass: SECTION_COLORS.announcements.pill },
] as const;

const STORAGE_KEY = "pagenav-pill";

function resolveActive(pathname: string): string {
  if (pathname.startsWith("/guide")) return "/guide";
  if (pathname.startsWith("/tips")) return "/tips";
  if (pathname.startsWith("/haejwo")) return "/haejwo";
  if (pathname.startsWith("/announcements")) return "/announcements";
  if (pathname === "/projects/new" || pathname.endsWith("/edit")) return "/projects/new";
  if (
    pathname.startsWith("/explore") ||
    pathname.startsWith("/developers/") ||
    pathname.startsWith("/projects/")
  )
    return "/explore";
  return "";
}

// 데스크탑 전용 — SiteHeader 안에서 사용
export function PageNav() {
  const pathname = usePathname();
  const active = resolveActive(pathname);
  const activeIndex = NAV_ITEMS.findIndex((i) => i.href === active);

  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });

  useEffect(() => {
    const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
    if (!el) {
      setPill((p) => ({ ...p, ready: false }));
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const next = { left: el.offsetLeft, width: el.offsetWidth };
    const top = el.offsetTop;
    const height = el.offsetHeight;

    let prev: { left: number; width: number } | null = null;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        prev = JSON.parse(saved);
      } catch {
        prev = null;
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    if (prev && (prev.left !== next.left || prev.width !== next.width)) {
      setPill({ left: prev.left, top, width: prev.width, height, ready: true });
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPill({ ...next, top, height, ready: true });
        });
      });
      return () => cancelAnimationFrame(id);
    }

    setPill({ ...next, top, height, ready: true });
  }, [activeIndex, pathname]);

  const activePill = activeIndex >= 0 ? NAV_ITEMS[activeIndex].pillClass : "";

  return (
    <nav aria-label="주요 메뉴" className="relative flex items-center gap-0.5 sm:gap-1">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 rounded-full transition-[transform,width,opacity] duration-300 ease-out motion-reduce:transition-none",
          activePill,
          pill.ready ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `translateX(${pill.left}px)`,
          top: pill.top,
          width: pill.width,
          height: pill.height,
        }}
      />
      {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            href={href}
            prefetch={true}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            title={isActive ? undefined : label}
            className={cn(
              "relative z-10 flex min-w-9 items-center justify-center rounded-full px-2.5 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              isActive
                ? "font-medium text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {isActive && (
              <span className="ml-1.5 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200 motion-reduce:animate-none">
                {label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// 모바일 전용 — (nav)/layout.tsx 최하단에서 사용
export function MobileNav() {
  const pathname = usePathname();
  const active = resolveActive(pathname);

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 inset-x-0 z-50 flex sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pb-[env(safe-area-inset-bottom)]"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, pillClass }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="group flex flex-1 items-center justify-center py-2.5 focus-visible:outline-none"
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-600",
                isActive
                  ? cn(pillClass, "text-white")
                  : "text-zinc-600 dark:text-zinc-400",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
