import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { WithdrawButton } from "@/components/privacy/withdraw-button";
import { Markdown } from "@/components/shared/markdown";
import { PageHero } from "@/components/shared/page-hero";
import { ReadingSurface } from "@/components/shared/reading-surface";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy/config";
import { formatKst } from "@/lib/privacy/format";
import { PRIVACY_POLICY_MD } from "@/lib/privacy/policy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — DSHS Developer Platform",
};

// 로그인한 사람에게만 내 동의 기록과 철회 버튼을 보여 준다.
async function ConsentStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 px-5 py-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        로그인하면 내 동의 기록과 동의 철회 버튼이 여기에 나와요.
      </p>
    );
  }

  const { data } = await supabase
    .from("privacy_consents")
    .select("policy_version, consented_at")
    .order("consented_at", { ascending: false });
  const records = data ?? [];
  const current = records.find((r) => r.policy_version === PRIVACY_POLICY_VERSION);

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
          아직 현재 버전({PRIVACY_POLICY_VERSION})에 동의하지 않았어요. 다른 페이지로 이동하면 동의 창이 떠요.
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

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        section="privacy"
        icon={ShieldCheck}
        title="개인정보 처리방침"
        description="어떤 정보를 왜 받고, 어떻게 지우는지 적었어요."
      />
      <main className="mx-auto grid max-w-3xl gap-5 bg-white px-6 py-8 dark:bg-zinc-950 sm:py-10">
        <ConsentStatus />
        <ReadingSurface>
          <Markdown>{PRIVACY_POLICY_MD}</Markdown>
        </ReadingSurface>
      </main>
    </>
  );
}
