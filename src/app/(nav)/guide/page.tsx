import { BookOpen } from "lucide-react";

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
      <section className="paper-grid border-b border-zinc-100 px-6 pt-12 pb-10 text-center sm:pt-14 dark:border-zinc-900">
        <span
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-purple-600 text-white"
          aria-hidden
        >
          <BookOpen className="h-7 w-7" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
          나도 개발해볼래!
        </h1>
        <p className="mx-auto mt-3 hidden max-w-xl text-base text-zinc-600 break-keep sm:block sm:text-lg dark:text-zinc-400">
          질문 몇 개에 답하면, AI한테 일 시키는 법부터 인터넷에 올리는 법까지 내 상황에 맞는 순서로 알려 줘요.
        </p>
      </section>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
        <GuideWizard initialType={type} />
      </main>
    </div>
  );
}
