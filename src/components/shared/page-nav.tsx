"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Code2, Sparkles, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/explore", label: "모든 프로젝트", icon: Search, pillClass: "bg-blue-600 shadow-blue-600/30" },
  { href: "/projects/new", label: "프로젝트 등록", icon: Code2, pillClass: "bg-emerald-600 shadow-emerald-600/30" },
  { href: "/guide", label: "나도 개발해볼래!", icon: Sparkles, pillClass: "bg-purple-600 shadow-purple-600/30" },
  { href: "/tips", label: "개발 팁", icon: Lightbulb, pillClass: "bg-amber-500 shadow-amber-500/30" },
] as const;

const STORAGE_KEY = "pagenav-pill";

function resolveActive(pathname: string): string {
  if (pathname.startsWith("/guide")) return "/guide";
  if (pathname.startsWith("/tips")) return "/tips";
  if (pathname === "/projects/new" || pathname.endsWith("/edit")) return "/projects/new";
  if (
    pathname.startsWith("/explore") ||
    pathname.startsWith("/developers/") ||
    pathname.startsWith("/projects/")
  )
    return "/explore";
  return "";
}

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
    <nav className="relative flex items-center gap-0.5 sm:gap-1">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 rounded-full shadow-md transition-all duration-300 ease-out",
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
            className={cn(
              "relative z-10 flex min-w-9 items-center justify-center rounded-full px-2.5 py-1.5 text-sm transition-colors duration-300",
              isActive
                ? "font-medium text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {isActive && (
              <span className="ml-1.5 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                {label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
