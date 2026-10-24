"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

/**
 * 헤더 오른쪽 공지사항 아이콘 — 내비 칸 대신 프로필 옆에 둔다. 공지 화면에서는 섹션 색 칩으로 활성 표시.
 * 공지 읽음 상태를 저장하지 않으므로 안 읽음 점·숫자 배지는 달지 않는다.
 */
export function AnnouncementsLink() {
  const active = usePathname().startsWith("/announcements");
  return (
    <Link
      href="/announcements"
      prefetch={true}
      aria-label="공지사항"
      aria-current={active ? "page" : undefined}
      title="공지사항"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "rounded-full",
        active
          ? SECTION_COLORS.announcements.chip
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
      )}
    >
      <Bell className="h-[1.1rem] w-[1.1rem]" aria-hidden />
    </Link>
  );
}
