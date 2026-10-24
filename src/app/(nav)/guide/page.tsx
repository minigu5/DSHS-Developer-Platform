import { BookOpen } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { GuideWizard } from "@/components/guide/guide-wizard";

export const metadata = {
  title: "바이브 코딩 가이드 — DSHS Developer Platform",
};

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="guide"
        icon={BookOpen}
        title="나도 개발해볼래!"
        description="만들고 싶은 프로그램과 쓰는 컴퓨터를 고르면 시작 방법을 단계별로 알려줘요."
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-9">
        <GuideWizard initialType={type} />
      </main>
    </div>
  );
}
