import type { CSSProperties } from "react";
import { Megaphone, Star } from "lucide-react";

import { ProjectIcon } from "@/components/projects/project-icon";

export type HowItWorksExamples = {
  /** 가장 최근 등록된 공개 프로젝트 */
  latestProject: { title: string; icon_url: string | null; authorName: string; typeLabel: string } | null;
  /** 가장 최근 리뷰 */
  latestReview: { comment: string; rating: number | null; reviewerName: string; projectTitle: string; projectIcon: string | null } | null;
  /** 가장 최근 해줘! 요청 */
  latestIdea: { title: string; statusLabel: string } | null;
};

const revealOrder = (n: number) => ({ "--reveal-delay": `${n * 90}ms` }) as CSSProperties;

function trim(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** 홈 "이렇게 써요" — 올리기 → 써 보고 리뷰 → 해줘로 요청, 각 칸 아래에 실제 최근 예시 한 줄. */
export function HowItWorks({ examples }: { examples: HowItWorksExamples }) {
  const { latestProject, latestReview, latestIdea } = examples;

  const steps = [
    {
      title: "만든 걸 올려요",
      body: "링크 하나와 짧은 설명이면 돼요. 아이콘은 주소에서 자동으로 가져와요. 팀 프로젝트면 팀원을 같이 적어요.",
      example: latestProject ? (
        <>
          <ProjectIcon src={latestProject.icon_url} title={latestProject.title} decorative className="h-[34px] w-[34px] shrink-0 rounded-[22%] ring-2 ring-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] dark:ring-zinc-900" />
          <span className="min-w-0 truncate">
            <b className="font-semibold text-zinc-900 dark:text-white">{latestProject.title}</b>
            {` · ${latestProject.authorName} · ${latestProject.typeLabel}`}
          </span>
        </>
      ) : (
        <span>아직 올라온 프로젝트가 없어요. 첫 번째가 되어 보세요.</span>
      ),
    },
    {
      title: "써 보고 리뷰를 남겨요",
      body: "친구가 만든 프로그램을 써 보고 별점이나 한마디를 남겨요. 만든 사람에게 가장 큰 피드백이에요.",
      example: latestReview ? (
        <>
          <ProjectIcon src={latestReview.projectIcon} title={latestReview.projectTitle} decorative className="h-[34px] w-[34px] shrink-0 rounded-[22%] ring-2 ring-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] dark:ring-zinc-900" />
          <span className="min-w-0 truncate">
            {latestReview.rating != null && (
              <span className="mr-1 inline-flex items-center gap-0.5 align-middle text-amber-500" aria-label={`별점 ${latestReview.rating}점`}>
                {Array.from({ length: latestReview.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" aria-hidden />
                ))}
              </span>
            )}
            {`"${trim(latestReview.comment, 22)}" · `}
            <b className="font-semibold text-zinc-900 dark:text-white">{latestReview.reviewerName}</b>
          </span>
        </>
      ) : (
        <span>아직 리뷰가 없어요. 써 본 프로젝트에 한마디 남겨 보세요.</span>
      ),
    },
    {
      title: "없으면 “해줘!”로 요청해요",
      body: "있으면 좋겠는 프로그램을 적어 두면 만들 수 있는 사람이 가져가요. 완성되면 그 글에 프로젝트가 붙어요.",
      example: latestIdea ? (
        <>
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[22%] bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" aria-hidden>
            <Megaphone className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">
            <b className="font-semibold text-zinc-900 dark:text-white">{latestIdea.title}</b>
            {` · ${latestIdea.statusLabel}`}
          </span>
        </>
      ) : (
        <span>아직 요청이 없어요. 있으면 좋겠는 프로그램을 적어 보세요.</span>
      ),
    },
  ];

  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="reveal flex flex-col gap-3 rounded-[20px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          style={revealOrder(i)}
        >
          <span
            className="grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-[13px] font-bold tabular-nums text-white dark:bg-white dark:text-zinc-900"
            aria-hidden
          >
            {i + 1}
          </span>
          <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">{step.title}</h3>
          <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 break-keep">{step.body}</p>
          <div className="mt-auto flex items-center gap-2.5 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-zinc-800/60 dark:text-zinc-400">
            {step.example}
          </div>
        </li>
      ))}
    </ol>
  );
}
