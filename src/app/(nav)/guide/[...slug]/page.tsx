import Link from "next/link";
import { notFound } from "next/navigation";
import { Construction, RefreshCw } from "lucide-react";

import { resolveSlug, picksToAnswers } from "@/lib/guide";
import { loadGuide } from "@/lib/guide-content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GuideViewer } from "@/components/guide/guide-viewer";
import { PageHero } from "@/components/shared/page-hero";
import { BookOpen } from "lucide-react";

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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="guide" icon={BookOpen} title={guideTitle} variant="compact">
        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          {picks.map((p) => (
            <span
              key={p.step.key}
              className="inline-flex h-6 items-center rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {p.step.segmentLabel}:{" "}
              <span className="ml-1 text-zinc-900 dark:text-white">{p.option.label}</span>
            </span>
          ))}
        </div>
      </PageHero>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">

        {guide ? (
          <GuideViewer
            steps={guide.steps}
            nextTitle={guide.nextTitle}
            nextSteps={guide.nextSteps}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
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
