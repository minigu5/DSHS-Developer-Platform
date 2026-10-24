"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PenLine } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { HaejwoCard, type HaejwoCardData } from "@/components/haejwo/haejwo-card";
import { parseHaejwoStatus } from "@/components/haejwo/haejwo-status-tabs";

/** 전체 목록을 받아 `?status=`로 클라이언트에서 거른다 — 서버 페이지는 searchParams를 읽지 않아 ISR 유지. */
export function HaejwoGrid({ ideas }: { ideas: HaejwoCardData[] }) {
  const filter = parseHaejwoStatus(useSearchParams().get("status"));
  const shown =
    filter === "all" ? ideas : filter === "done" ? ideas.filter((i) => i.status === "done") : ideas.filter((i) => i.status !== "done");

  if (shown.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
        <p className="text-zinc-600 dark:text-zinc-400">
          {ideas.length === 0 ? "아직 올라온 아이디어가 없어요." : "이 상태의 아이디어가 없어요."}
        </p>
        {ideas.length === 0 && (
          <Link
            href="/haejwo/new"
            className={cn(buttonVariants({ size: "sm" }), "mt-4 h-9 rounded-full", SECTION_COLORS.haejwo.button)}
          >
            <PenLine className="mr-1.5 h-4 w-4" aria-hidden /> 첫 아이디어 올리기
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((idea) => (
        <HaejwoCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}
