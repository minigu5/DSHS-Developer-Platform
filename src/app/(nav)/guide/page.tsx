import { Wand2 } from "lucide-react";
import { GuideWizard } from "@/components/guide/guide-wizard";

export const metadata = {
  title: "바이브 코딩 가이드 — DSHS Developer Platform",
};

export default function GuidePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-600/10" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
            <Wand2 className="h-4 w-4" /> 바이브 코딩 가이드
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            내 상황에 맞는 가이드 찾기
          </h1>
          <p className="mt-3 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
            몇 가지 질문에 답하면 딱 맞는 바이브 코딩 시작 가이드를 찾아드려요.
          </p>
        </div>

        <GuideWizard />
      </main>
    </div>
  );
}
