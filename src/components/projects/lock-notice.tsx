import { Lock } from "lucide-react";

import { PRIVACY_CONTACT_EMAIL } from "@/lib/privacy/config";
import { cn } from "@/lib/utils";

/** 관리자가 잠근 프로젝트 안내 — 주인·팀원(과 관리자)에게만. 상세 페이지(서버)와 수정 폼이 같이 쓴다(2026-11-07) */
export function LockNotice({ reason, className }: { reason: string | null; className?: string }) {
  return (
    <div role="status" className={cn("rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 sm:p-6 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300", className)}>
      <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
        <Lock className="h-4 w-4" aria-hidden />
        만든 사람과 팀원에게만 보이는 안내예요
      </p>
      <h2 className="font-heading mt-1 text-lg font-bold tracking-tight break-keep text-rose-800 dark:text-rose-200">관리자가 이 프로젝트를 비공개로 잠갔어요</h2>
      {reason && (
        <p className="mt-2 break-keep">
          <span className="font-semibold">이유:</span> {reason}
        </p>
      )}
      <p className="mt-2 break-keep">
        보고 고치는 건 그대로 할 수 있지만, 관리자가 풀 때까지 다시 공개할 수 없어요. 고친 뒤 풀어 달라면{" "}
        <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="font-semibold underline underline-offset-4">
          {PRIVACY_CONTACT_EMAIL}
        </a>
        로 알려 주세요.
      </p>
    </div>
  );
}
