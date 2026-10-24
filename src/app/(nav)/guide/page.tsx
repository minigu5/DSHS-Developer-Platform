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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            나도 개발해볼래!
          </h1>
          <p className="mt-3 max-w-xl text-base sm:text-lg text-zinc-600 dark:text-zinc-400 break-keep">
            만들고 싶은 것과 쓰는 컴퓨터를 고르면, AI 코딩 도구로 시작하는 방법을 단계별로 알려줘요.
          </p>
        </div>

        <GuideWizard initialType={type} />
      </main>
    </div>
  );
}
