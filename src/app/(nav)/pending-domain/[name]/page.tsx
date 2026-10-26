import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { buttonVariants } from "@/components/ui/button";
import { ROOT_DOMAIN, validateName } from "@/lib/domains/name";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

// 소유 확인 전인 <이름>.dshs.dev 로 들어오면 Cloudflare 바로가기(자리표시)가 여기로 보낸다(src/lib/domains/activate.ts).
// DB 를 읽지 않는다 — 주인·프로젝트(비공개일 수도 있음)를 드러내지 않으려고 이름만 보여 준다.

export const metadata = {
  title: "연결 확인 전인 주소 — DSHS Developer Platform",
  robots: { index: false, follow: false },
};

export default async function PendingDomainPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!validateName(name).ok) notFound();
  const fqdn = `${name}.${ROOT_DOMAIN}`;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="domains"
        icon={Globe}
        title="아직 연결 확인 전인 주소예요"
        description={`${fqdn}는 주인이 연결 확인을 마치면 열려요.`}
        actions={
          <>
            <Link href="/domains" className={cn("inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors", SECTION_COLORS.domains.button)}>
              내 주소라면 연결 마치기
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full px-5 text-sm")}>
              도메인 마련하기 알아보기
            </Link>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-9">
        {/* 모바일은 머리 설명이 숨겨지므로 본문에 한 번 더 */}
        <p className="text-center text-sm text-zinc-600 sm:hidden dark:text-zinc-400">
          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{fqdn}</span>는 주인이 도메인 마련하기에서 내 사이트 확인과 호스트 연결을 마치면
          그 사이트로 열려요. 주인이라면 위 버튼을 눌러 남은 단계를 이어서 해요.
        </p>
      </main>
    </div>
  );
}
