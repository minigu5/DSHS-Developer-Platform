import Link from "next/link";
import { Megaphone, Newspaper } from "lucide-react";

import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

const TABS = [
  { key: "tips", href: "/tips", label: "개발 팁", icon: Newspaper },
  { key: "haejwo", href: "/haejwo", label: "해줘!", icon: Megaphone },
] as const;

/**
 * 커뮤니티 안 두 목록(개발 팁 · 해줘!)을 오가는 세그먼트. 활성 탭만 섹션 색 칩.
 * 두 목록 페이지가 ISR 서버 컴포넌트라 usePathname 대신 `current` prop으로 활성 탭을 받는다.
 */
export function CommunityTabs({ current }: { current: "tips" | "haejwo" }) {
  return (
    <nav
      aria-label="커뮤니티 분류"
      className="inline-flex gap-0.5 rounded-full bg-zinc-100 p-[3px] dark:bg-zinc-800"
    >
      {TABS.map(({ key, href, label, icon: Icon }) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active
                ? cn(SECTION_COLORS[key].chip, "font-semibold")
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
