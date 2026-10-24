"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Search, Rocket, BookOpen, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

// 알약 색은 섹션 색 맵(src/lib/section-colors.ts)과 공유 — 페이지 머리 타일·주 버튼과 같은 색
const NAV_ITEMS = [
  { href: "/explore", label: "모든 프로젝트", icon: Search, pillClass: SECTION_COLORS.explore.pill },
  { href: "/projects/new", label: "프로젝트 등록", icon: Rocket, pillClass: SECTION_COLORS.new.pill },
  { href: "/guide", label: "나도 개발해볼래!", icon: BookOpen, pillClass: SECTION_COLORS.guide.pill },
  // 개발 팁(/tips)과 해줘!(/haejwo)를 한 칸으로 — 칸은 /tips로 가고, 활성은 두 경로 모두 이 칸
  { href: "/tips", label: "커뮤니티", icon: MessagesSquare, pillClass: SECTION_COLORS.tips.pill },
] as const;

// 공지사항은 내비 칸이 아니라 헤더 오른쪽 벨(announcements-link.tsx)이다 — 공지 화면에서는 어느 칸도 켜지지 않는다.

const STORAGE_KEY = "pagenav-pill";

// 커뮤니티 칸은 해줘! 화면에서 주황, 개발 팁 화면에서 분홍 — 페이지 머리 타일·주 버튼 색과 맞춘다
function pillFor(href: string, pillClass: string, pathname: string): string {
  return href === "/tips" && pathname.startsWith("/haejwo") ? SECTION_COLORS.haejwo.pill : pillClass;
}

function resolveActive(pathname: string): string {
  if (pathname.startsWith("/guide")) return "/guide";
  if (pathname.startsWith("/tips") || pathname.startsWith("/haejwo")) return "/tips";
  if (pathname === "/projects/new" || pathname.endsWith("/edit")) return "/projects/new";
  if (
    pathname.startsWith("/explore") ||
    pathname.startsWith("/developers/") ||
    pathname.startsWith("/projects/")
  )
    return "/explore";
  return "";
}

// 누른 메뉴를 주소가 바뀌기 전에 먼저 활성으로 보여 준다(서버 왕복이 길어 1초쯤 반응이 없던 문제, 2026-10-24).
// 주소가 바뀌면(또는 그대로 머물면 다음 클릭 때) 실제 주소 기준으로 돌아간다.
function useOptimisticActive() {
  const pathname = usePathname();
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const active = pending && pending.from === pathname ? pending.href : resolveActive(pathname);
  const onNavigate = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새 탭 열기 등
    setPending({ href, from: pathname });
  };
  return { pathname, active, onNavigate };
}

// 데스크탑 전용 — SiteHeader 안에서 사용
export function PageNav() {
  const { pathname, active, onNavigate } = useOptimisticActive();
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

  const activeItem = activeIndex >= 0 ? NAV_ITEMS[activeIndex] : null;
  const activePill = activeItem ? pillFor(activeItem.href, activeItem.pillClass, pathname) : "";

  return (
    <nav aria-label="주요 메뉴" className="relative flex items-center gap-0.5 sm:gap-1">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 rounded-full transition-[transform,width,opacity,background-color] duration-300 ease-out motion-reduce:transition-none",
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
            onClick={onNavigate(href)}
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
  const { pathname, active, onNavigate } = useOptimisticActive();

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
            onClick={onNavigate(href)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="group flex flex-1 items-center justify-center py-2.5 focus-visible:outline-none"
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-blue-600",
                isActive
                  ? cn(pillFor(href, pillClass, pathname), "text-white")
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
