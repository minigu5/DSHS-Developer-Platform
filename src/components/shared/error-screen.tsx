"use client";

import { useEffect } from "react";

import { AUTH_LEAD_CLASS, AUTH_TITLE_CLASS, AuthShell, riseDelay } from "@/components/auth/auth-shell";
import { isStaleDeployError, shouldAutoReload } from "@/lib/error-recovery";

const RELOAD_KEY = "ds_error_reload_at";

function lastReloadAt(): number | null {
  try {
    const v = Number(sessionStorage.getItem(RELOAD_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * src/app/error.tsx·global-error.tsx 공용 오류 화면. Next 기본 영어 화면 대신 보이고,
 * 다음에 같은 일이 나면 원인을 알 수 있게 오류 내용을 작게 보여 준다(서버 오류는 운영에서 메시지가 가려져 digest 만 의미 있음).
 * 배포 엇갈림 오류면 한 번 자동으로 새로 고친다(src/lib/error-recovery.ts) — 그 사이 화면이 잠깐 보일 수 있다.
 */
export function ErrorScreen({ error }: { error: Error & { digest?: string } }) {
  const stale = isStaleDeployError(error);

  useEffect(() => {
    console.error(error);
    if (!stale) return;
    const now = Date.now();
    if (!shouldAutoReload(lastReloadAt(), now)) return;
    try {
      sessionStorage.setItem(RELOAD_KEY, String(now));
    } catch {
      // 저장이 막혀 있으면 반복 방지를 못 하므로 자동 새로 고침도 하지 않는다
      return;
    }
    window.location.reload();
  }, [error, stale]);

  const detail = [error.name && error.name !== "Error" ? error.name : null, error.message, error.digest ? `digest ${error.digest}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <AuthShell mark="warning">
      <h1 className={AUTH_TITLE_CLASS} style={riseDelay(60)}>
        화면을 불러오지 못했어요
      </h1>
      <p className={AUTH_LEAD_CLASS} style={riseDelay(120)}>
        {stale ? "사이트가 방금 새로 바뀌었어요. 새로 고치면 대부분 해결돼요." : "새로 고쳐 보고, 계속 이러면 아래 내용을 알려 주세요."}
      </p>
      <div className="rise mt-6 flex flex-wrap justify-center gap-2" style={riseDelay(180)}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          새로 고침
        </button>
        {/* 화면이 꼬인 상태라 클라이언트 이동 대신 새로 불러온다 */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 일부러 전체 새로 불러오기 */}
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          홈으로
        </a>
      </div>
      {detail && (
        <p className="rise mt-6 max-w-[460px] break-all font-mono text-xs leading-relaxed text-zinc-500 dark:text-zinc-400" style={riseDelay(240)}>
          {detail}
        </p>
      )}
    </AuthShell>
  );
}
