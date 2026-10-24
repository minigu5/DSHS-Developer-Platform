import type { WikiStep } from "@/lib/guide-wiki/types";
import { StepBody } from "@/components/guide-wiki/step-body";

/** 모든 단계를 이어서 보여 준다. 편집기 전체 미리보기와 옛 버전 보기가 함께 쓴다. */
export function DocRender({ steps }: { steps: WikiStep[] }) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, i) => (
        <article
          key={step.id}
          className="rounded-3xl border border-zinc-200 bg-white px-6 py-6 sm:px-8 sm:py-7 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="mb-2.5 text-[13px] font-semibold text-purple-600 dark:text-purple-400">
            {i + 1} / {steps.length} 단계
          </p>
          <StepBody body={step.body} />
        </article>
      ))}
    </div>
  );
}
