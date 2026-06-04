import { GuideWizard } from "@/components/guide/guide-wizard";

export const metadata = {
  title: "바이브 코딩 가이드 — DSHS Developer Platform",
};

export default function GuidePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-600/10" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 py-8">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            바이브 코딩 가이드
          </h1>
          <p className="mt-3 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
            몇 가지 질문에 답하면 당신에게 딱 맞는 바이브 코딩 시작 가이드를 찾아드려요.
          </p>
        </div>

        <div className="flex flex-1 justify-center">
          <GuideWizard />
        </div>
      </main>
    </div>
  );
}
