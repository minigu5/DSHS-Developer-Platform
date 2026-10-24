"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { syncFromSource, type SaveResult } from "@/lib/guide-wiki/actions";

const SAVE_FAILED = "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

const BUTTON_CLASS =
  "inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-full border border-zinc-300 bg-white px-4 text-[13px] font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:self-auto dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800";

interface StaleBannerProps {
  docKey: string;
  /** 지금 화면이 기준으로 삼는 최신 버전. */
  baseRev: number;
  /** 고치던 내용이 있어 가져올 수 없을 때(편집기). */
  blocked?: boolean;
  /** 다른 저장이 진행 중이라 잠깐 못 누를 때. */
  disabled?: boolean;
  /** 가져오는 동안 true. 같은 화면의 다른 저장과 겹치지 않게 부모가 알 수 있다. */
  onSyncingChange?: (syncing: boolean) => void;
  /** 비로그인이면 버튼 대신 이 주소(로그인)로 가는 링크. */
  loginHref?: string;
}

/** 저장소 원본이 새로 바뀌었다는 안내 띠와 "원본 가져오기" 버튼. 편집기·기록 화면이 함께 쓴다. */
export function StaleBanner({
  docKey,
  baseRev,
  blocked = false,
  disabled = false,
  onSyncingChange,
  loginHref,
}: StaleBannerProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const busyRef = useRef(false);

  function setBusy(busy: boolean) {
    busyRef.current = busy;
    setSyncing(busy);
    onSyncingChange?.(busy);
  }

  async function runSync() {
    if (busyRef.current || blocked || baseRev < 1) return;
    setBusy(true);
    let result: SaveResult;
    try {
      result = await syncFromSource({ key: docKey, baseRev });
    } catch {
      result = { error: SAVE_FAILED };
    }
    if ("revNo" in result) {
      toast.success(`저장소 원본을 가져왔어요 (버전 ${result.revNo})`);
    } else if ("conflict" in result) {
      toast.error("그 사이 다른 사람이 저장했어요. 최신 내용으로 다시 불러올게요.");
    } else {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    // 페이지가 새 최신 버전으로 다시 그려진다.
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">저장소 원본이 새로 바뀌었어요</p>
          {blocked && (
            <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">
              고친 내용이 있으면 가져올 수 없어요. 저장하거나 취소한 뒤 가져와 주세요.
            </p>
          )}
        </div>
      </div>
      {loginHref ? (
        <Link href={loginHref} className={BUTTON_CLASS}>
          로그인하고 원본 가져오기
        </Link>
      ) : (
        <button
          type="button"
          onClick={runSync}
          disabled={blocked || disabled || syncing}
          className={BUTTON_CLASS}
        >
          {syncing ? "가져오는 중…" : "원본 가져오기"}
        </button>
      )}
    </div>
  );
}
