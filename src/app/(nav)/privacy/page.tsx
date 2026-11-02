import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { ConsentStatus } from "@/components/privacy/consent-status";
import { MarkdownRender } from "@/components/shared/markdown-render";
import { PageHero } from "@/components/shared/page-hero";
import { ReadingSurface } from "@/components/shared/reading-surface";
import { PRIVACY_POLICY_MD } from "@/lib/privacy/policy";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy/version";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — DSHS Developer Platform",
};

// 쿠키를 읽지 않아 빌드 때 한 번 그려 두는 정적 페이지 — 본문 마크다운도 그때 변환되므로 요청마다 서버 CPU를 쓰지 않는다.
// 로그인한 사람의 동의 기록은 ConsentStatus가 브라우저에서 읽는다.
export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        section="privacy"
        icon={ShieldCheck}
        title="개인정보 처리방침"
        description="어떤 정보를 왜 받고, 어떻게 지우는지 적었어요."
      />
      <main className="mx-auto grid max-w-3xl gap-5 bg-white px-6 py-8 *:min-w-0 dark:bg-zinc-950 sm:py-10">
        <ConsentStatus version={PRIVACY_POLICY_VERSION} />
        <ReadingSurface>
          <MarkdownRender>{PRIVACY_POLICY_MD}</MarkdownRender>
        </ReadingSurface>
      </main>
    </>
  );
}
