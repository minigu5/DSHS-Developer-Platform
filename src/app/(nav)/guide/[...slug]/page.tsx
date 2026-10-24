import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveSlug, picksToAnswers, planGuide, chipLabel } from "@/lib/guide";
import { loadGuide } from "@/lib/guide-content";
import { GUIDE_AI_LABELS } from "@/lib/constants";
import { GuideViewer } from "@/components/guide/guide-viewer";

interface GuideResultPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: GuideResultPageProps): Promise<Metadata> {
  const { slug } = await params;
  const picks = resolveSlug(slug);
  if (!picks) return { title: "바이브 코딩 가이드 — DSHS Developer Platform" };
  return { title: `${planGuide(picksToAnswers(picks)).title} — DSHS Developer Platform` };
}

export default async function GuideResultPage({ params }: GuideResultPageProps) {
  const { slug } = await params;
  const picks = resolveSlug(slug);

  // 옛 주소(터미널 질문이 있던 시절)나 잘못된 주소는 위저드로
  if (!picks) redirect("/guide");

  const answers = picksToAnswers(picks);
  const { plan, chapters } = await loadGuide(answers);
  const path = `/guide/${slug.join("/")}`;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {picks.map((p) => {
            const label = chipLabel(p.option);
            return label ? (
              <span
                key={p.step.key}
                className="inline-flex h-7 items-center rounded-full bg-purple-100 px-3 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              >
                {label}
              </span>
            ) : null;
          })}
          <Link
            href="/guide"
            className="ml-auto text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-white"
          >
            다시 고르기
          </Link>
        </div>

        <h1 className="font-heading mb-7 text-3xl font-bold tracking-tight text-zinc-900 break-keep sm:text-4xl dark:text-white">
          {plan.title}
        </h1>

        {chapters.length > 0 ? (
          <GuideViewer
            storageKey={path}
            chapters={chapters}
            answers={answers}
            aiLabel={GUIDE_AI_LABELS[plan.aiKey]}
            recommendedNote={plan.recommended ? "무료로 시작할 수 있는 ChatGPT(Codex)로 골랐어요." : null}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
            <p className="text-lg font-semibold text-zinc-900 dark:text-white">이 조합의 가이드를 준비하고 있어요</p>
            <Link href="/guide" className="mt-4 inline-block text-sm font-medium text-purple-700 hover:underline dark:text-purple-300">
              다른 걸 골라 보기
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
