"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

import Link from "@/components/shared/link";
import { adminListLikers, type Liker } from "@/lib/admin/actions";
import { isDeveloper } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

/**
 * 하트·좋아요를 누른 사람 — 관리자에게만 보이는 접이식 카드. 관리자가 아니면 아무것도 그리지 않는다.
 * 세션 이메일은 화면 표시 여부만 정하고, 실제 권한은 서버 액션(requireAdmin)이 다시 확인한다.
 */
export function LikersCard({ kind, id, className }: { kind: "project" | "tip"; id: string; className?: string }) {
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const word = kind === "project" ? "하트" : "좋아요";

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!active || !isDeveloper(session?.user.email)) return;
        const rows = await adminListLikers(kind, id);
        if (active) setLikers(rows);
      });
    return () => {
      active = false;
    };
  }, [kind, id]);

  if (!likers) return null;

  return (
    <details className={`group rounded-3xl border border-rose-200 bg-white p-5 dark:border-rose-900/60 dark:bg-zinc-900 ${className ?? ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
          <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden />
          {word} 누른 사람 {likers.length}명
          <span className="font-normal text-zinc-500 dark:text-zinc-400">· 관리자에게만 보여요</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      {likers.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">아직 아무도 안 눌렀어요.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          {likers.map((l) => (
            <li key={l.userId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <Link href={`/developers/${l.userId}`} className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200">
                  {l.name}
                </Link>
                {l.anonymousOwner && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    만든 사람 · 남에게 숨김
                  </span>
                )}
              </span>
              <time dateTime={l.at} className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(l.at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
