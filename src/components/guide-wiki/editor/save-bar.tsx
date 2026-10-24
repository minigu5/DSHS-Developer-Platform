"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

const SUMMARY_INPUT_ID = "gw-save-summary";

interface SaveBarProps {
  /** "바뀐 점: …" 또는 아직 바뀐 게 없다는 안내. */
  changeText: string;
  summary: string;
  onSummary: (text: string) => void;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  conflict: { latestRev: number; diffHref: string } | null;
  onOverwrite: () => void;
}

/** 편집기 아래 고정 저장 바. 모바일에서는 하단 탭바 위에 붙는다. */
export function SaveBar({
  changeText,
  summary,
  onSummary,
  canSave,
  saving,
  onSave,
  onCancel,
  conflict,
  onOverwrite,
}: SaveBarProps) {
  return (
    <div className="sticky bottom-14 z-30 border-t border-zinc-200 bg-white px-6 py-3.5 sm:bottom-0 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        {conflict && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <p className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                편집을 시작한 뒤 다른 사람이 먼저 저장했어요(지금 최신 버전 {conflict.latestRev}). 내
                편집 내용은 그대로 있어요.
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={conflict.diffHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-300 bg-white px-4 font-medium text-amber-900 transition-colors hover:bg-amber-100 sm:min-h-9 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
              >
                그 사이 바뀐 점 보기
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">(새 탭)</span>
              </a>
              <button
                type="button"
                onClick={onOverwrite}
                disabled={saving}
                className="inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-4 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? "저장하는 중…" : "내 내용으로 저장"}
              </button>
            </div>
            <p className="text-[13px] text-amber-800 dark:text-amber-200">
              내 내용으로 저장하면 그 사람이 고친 내용 위에 내 내용이 덮어써져요. 그 사람이 저장한
              버전은 기록에 그대로 남아요.
            </p>
          </div>
        )}

        <p aria-live="polite" className="text-[13px] text-zinc-600 dark:text-zinc-400">
          {changeText}
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor={SUMMARY_INPUT_ID} className="sr-only">
            무엇을 고쳤나요?
          </label>
          <input
            id={SUMMARY_INPUT_ID}
            type="text"
            value={summary}
            onChange={(e) => onSummary(e.target.value)}
            maxLength={100}
            required
            placeholder="무엇을 고쳤나요? 예) Windows에서 막히는 부분 팁 추가"
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 outline-none placeholder:text-zinc-500 focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/10 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400 dark:focus-visible:border-zinc-300"
          />
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 shrink-0 items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center rounded-full px-[22px] text-sm font-semibold transition-colors sm:flex-none",
                canSave && !saving
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "cursor-not-allowed bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              )}
            >
              {saving ? "저장하는 중…" : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
