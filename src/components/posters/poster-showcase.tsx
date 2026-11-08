"use client";

// 프로젝트 상세 옆칸 맨 위의 걸린 포스터. 마우스를 올려도 커지지 않는다(사이트 규칙 — 사용자 결정 2026-11-07),
// 누르면 크게 보기 창. 남의 프로젝트에서 크게 볼 땐 "내 프로젝트로도 만들 수 있어요" 한 줄 = 포스터 기능 홍보 길.
// 보일지는 상세 화면이 정한다(showcaseVisible — 공개 프로젝트만).

import { useState } from "react";
import { ArrowRight, Maximize2, Sparkles } from "lucide-react";

import Link from "@/components/shared/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { posterImageAt } from "@/lib/posters/hang-logic";

import { POSTER_LIST, POSTER_PARAM, openPosterSheet } from "./poster-sheet-nav";

export function PosterShowcase({
  projectId,
  title,
  imageUrl,
  isAi,
  canEdit,
  sheet,
}: {
  projectId: string;
  title: string;
  imageUrl: string;
  isAi: boolean;
  canEdit: boolean;
  /** 이 화면에 포스터 옆 칸이 있다(서버 상세 페이지) — "포스터 바꾸기"가 그 자리에서 연다. 빠른 상세는 서버 상세로 넘긴다 */
  sheet: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${title} 포스터 크게 보기`}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:focus-visible:ring-offset-zinc-950"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본(학생이 올린 그림·찍은 PNG) */}
        <img src={posterImageAt(imageUrl, 640)} alt="" loading="lazy" className="block w-full rounded-2xl" />
        <span className="absolute right-4 bottom-4 inline-flex items-center gap-1 rounded-full bg-zinc-900/85 px-2.5 py-1 text-xs font-medium text-white transition-colors group-hover:bg-zinc-900 dark:bg-white/90 dark:text-zinc-900 dark:group-hover:bg-white">
          <Maximize2 className="h-3 w-3" aria-hidden /> 크게 보기
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* 공용 창은 left:50% + 너비 auto 라 폭이 "화면 오른쪽 절반"까지로 묶여 포스터가 작게 나왔다(2026-11-07 사용자 "더 확대돼야").
            좌우 0 + mx-auto 로 가운데 두면 그림이 화면 높이를 다 쓴다 */}
        <DialogContent className="right-0 left-0 mx-auto w-fit max-w-[calc(100%-2rem)] translate-x-0 gap-3 p-3 sm:max-w-[calc(100%-2rem)]">
          <DialogTitle className="sr-only">{title} 홍보 포스터</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본 */}
          <img src={posterImageAt(imageUrl, 1600)} alt={`${title} 홍보 포스터`} className="mx-auto block max-h-[calc(100dvh-7rem)] w-auto max-w-full rounded-lg object-contain" />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            {isAi ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <Sparkles className="h-3 w-3" aria-hidden /> AI로 만든 포스터
              </span>
            ) : (
              <span />
            )}
            {canEdit && sheet ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openPosterSheet();
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
              >
                포스터 바꾸기 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : canEdit ? (
              <Link href={`/projects/${projectId}?${POSTER_PARAM}=${POSTER_LIST}`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300">
                포스터 바꾸기 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <Link href="/posters/start" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400">
                이 포스터, 내 프로젝트로도 만들 수 있어요 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
