import Link from "next/link";
import { notFound } from "next/navigation";
import { Construction, RefreshCw } from "lucide-react";

import { resolveSlug, picksToAnswers } from "@/lib/guide";
import { loadGuide } from "@/lib/guide-content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GuideViewer } from "@/components/guide/guide-viewer";

interface GuideResultPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function GuideResultPage({ params }: GuideResultPageProps) {
  const { slug } = await params;
  const picks = resolveSlug(slug);

  if (!picks) notFound();

  const guide = await loadGuide(picksToAnswers(picks));

  const byKey = (key: string) => picks.find((p) => p.step.key === key)?.option.label;
  const guideTitle = `${byKey("ai")} · ${byKey("type")} 가이드`;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-600/10" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 py-8">
        {/* 선택 요약 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {picks.map((p) => (
            <span
              key={p.step.key}
              className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400"
            >
              {p.step.segmentLabel}:{" "}
              <span className="text-zinc-900 dark:text-white">{p.option.label}</span>
            </span>
          ))}
        </div>

        <h1 className="mb-8 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {guideTitle}
        </h1>

        {guide ? (
          <GuideViewer
            steps={guide.steps}
            nextTitle={guide.nextTitle}
            nextSteps={guide.nextSteps}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/50 px-6 py-20 text-center backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/40">
            <Construction className="h-10 w-10 text-blue-500" />
            <p className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
              가이드 내용을 준비 중이에요
            </p>
            <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              이 조합에 맞는 단계별 바이브 코딩 가이드가 곧 채워질 예정입니다.
            </p>
            <Link
              href="/guide"
              className={cn(buttonVariants({ variant: "outline" }), "mt-6 rounded-full")}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> 다시 선택하기
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
