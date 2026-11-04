import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { GuideWizard } from "@/components/guide/guide-wizard";
import { GuideResumeCard } from "@/components/guide/guide-resume-card";

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
        description="질문 몇 개에 답하면, AI한테 일 시키는 법부터 인터넷에 올리는 법까지 내 상황에 맞는 순서로 알려 줘요."
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-9">
        <GuideResumeCard />
        <GuideWizard initialType={type} />
        <p className="mt-10 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
          가이드는 누구나 고칠 수 있어요 ·{" "}
          <Link
            href="/guide-wiki"
            className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            전체 지도
          </Link>{" "}
          ·{" "}
          <Link
            href="/guide-wiki/changes"
            className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            최근 바뀜
          </Link>
        </p>
      </main>
    </div>
  );
}
