"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/shared/link";
import { cameFromExplore, claimArrivalFromExplore } from "@/lib/explore-return";

/**
 * 상세 맨 위 "← 모든 프로젝트". 탐색에서 왔으면 router.back()으로 돌아가 스크롤·필터가 그대로고,
 * 아니면(홈·프로필·주소 직접 입력) 평범하게 /explore로 간다.
 */
export function BackToExplore({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // 댓글을 달면 router.refresh()가 Next 기록 칸을 다시 써서 표시가 지워질 수 있어 여기에도 들고 있는다
  const fromExplore = useRef(false);

  useEffect(() => {
    fromExplore.current = claimArrivalFromExplore(pathname) || cameFromExplore();
  }, [pathname]);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // 새 탭으로 열기(⌘·Ctrl·Shift·가운데 클릭)는 그대로 둔다
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!fromExplore.current && !cameFromExplore()) return;
    e.preventDefault();
    router.back();
  }

  return (
    <Link href="/explore" onClick={handleClick} className={className}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      모든 프로젝트
    </Link>
  );
}
