"use client";

// 프로젝트 상세 옆칸 맨 위의 빈 포스터 칸 — 걸린 포스터가 없을 때 주인·팀원에게만 보인다(posterSlotVisible).
// 누르면 수정 화면과 같은 포스터 옆 칸(PosterSheet)이 상세 위에서 열린다(2026-11-08 사용자 결정 — 안내 카드 대신).
// 빠른 상세 화면엔 옆 칸이 없어서 `?poster=list` 를 단 서버 상세 페이지로 넘긴다.

import { ImagePlus } from "lucide-react";

import Link from "@/components/shared/link";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

import { POSTER_LIST, POSTER_PARAM, openPosterSheet } from "./poster-sheet-nav";

const SLOT =
  "flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-zinc-300 bg-white px-6 py-9 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60 dark:focus-visible:ring-offset-zinc-950";

function SlotBody() {
  return (
    <>
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", SECTION_COLORS.new.tile)}>
        <ImagePlus className="h-5 w-5" aria-hidden />
      </span>
      <span className="font-heading text-[15px] font-semibold text-zinc-900 dark:text-white">홍보 포스터 걸기</span>
      <span className="text-[13px] break-keep text-zinc-600 dark:text-zinc-400">AI로 만들거나 그림을 올리면 여기에 걸려요</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">나에게만 보이는 칸이에요</span>
    </>
  );
}

/** `sheet`: 이 화면에 포스터 옆 칸이 있다(서버 상세 페이지) */
export function PosterSlot({ projectId, sheet }: { projectId: string; sheet: boolean }) {
  if (!sheet) {
    return (
      <Link href={`/projects/${projectId}?${POSTER_PARAM}=${POSTER_LIST}`} className={SLOT}>
        <SlotBody />
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => openPosterSheet()} className={SLOT}>
      <SlotBody />
    </button>
  );
}
