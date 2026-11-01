"use client";

import { useEffect, useState } from "react";

import { WithdrawButton } from "@/components/privacy/withdraw-button";
import { formatKst } from "@/lib/privacy/format";
import { createClient } from "@/lib/supabase/client";

type ConsentRecord = { policy_version: string; consented_at: string };
type State = { status: "loading" } | { status: "guest" } | { status: "user"; records: ConsentRecord[] };

/**
 * 로그인한 사람에게만 내 동의 기록과 철회 버튼을 보여 준다.
 * 브라우저에서 읽는다 — 서버에서 읽으면 `/privacy`가 요청마다 그려져서(서버 CPU) 빌드 때 만든 정적 페이지로 둘 수 없다.
 * 기록은 RLS가 본인 것만 돌려주고, 탈퇴는 서버 액션이 `getUser()`로 다시 확인한다.
 */
export function ConsentStatus({ version }: { version: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setState({ status: "guest" });
        return;
      }
      const { data } = await supabase
        .from("privacy_consents")
        .select("policy_version, consented_at")
        .order("consented_at", { ascending: false });
      if (!cancelled) setState({ status: "user", records: data ?? [] });
    }
    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <div aria-busy="true" className="h-[58px] rounded-2xl bg-zinc-50 dark:bg-zinc-900" />;
  }

  if (state.status === "guest") {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 px-5 py-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        로그인하면 내 동의 기록과 동의 철회 버튼이 여기에 나와요.
      </p>
    );
  }

  const { records } = state;
  const current = records.find((r) => r.policy_version === version);

  return (
    <section
      aria-labelledby="consent-status-title"
      className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
    >
      <h2 id="consent-status-title" className="font-heading text-lg font-bold text-zinc-900 dark:text-white">
        내 동의 기록
      </h2>
      {current ? (
        <p className="mt-2 text-[15px] text-zinc-700 dark:text-zinc-300">
          <time dateTime={current.consented_at}>{formatKst(current.consented_at)}</time>에 동의했어요 (버전 {current.policy_version}).
        </p>
      ) : (
        <p className="mt-2 text-[15px] text-zinc-700 dark:text-zinc-300">
          아직 현재 버전({version})에 동의하지 않았어요. 다른 페이지로 이동하면 동의 창이 떠요.
        </p>
      )}

      {records.length > 1 && (
        <ul className="mt-3 grid gap-1 text-[13px] text-zinc-600 dark:text-zinc-400">
          {records.map((r) => (
            <li key={r.policy_version}>
              버전 {r.policy_version} · <time dateTime={r.consented_at}>{formatKst(r.consented_at)}</time>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-zinc-600 break-keep dark:text-zinc-400">
          동의를 철회하면 계정과 내가 쓴 글이 모두 지워지고 되돌릴 수 없어요.
        </p>
        <WithdrawButton />
      </div>
    </section>
  );
}
