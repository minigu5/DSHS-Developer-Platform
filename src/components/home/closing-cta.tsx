import Link from "next/link";
import { Plus, Rocket } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ProjectIcon } from "@/components/projects/project-icon";
import type { ShelfProject } from "@/components/home/icon-shelf";

/** 홈 끝 "마무리 한 번 더" — 끝까지 내린 사람에게 등록을 한 번 더 권하는 어두운 단색 카드. */
export function ClosingCta({ projects }: { projects: ShelfProject[] }) {
  const sample = projects.slice(0, 3);

  return (
    <div className="reveal flex flex-col items-center gap-2 rounded-[28px] bg-zinc-900 px-6 py-10 text-center text-white sm:px-10 sm:py-14 dark:bg-zinc-100 dark:text-zinc-900">
      <div className="mb-2 flex gap-1.5" aria-hidden>
        {sample.map((p) => (
          <ProjectIcon
            key={p.id}
            src={p.icon_url}
            title={p.title}
            decorative
            className="h-9 w-9 rounded-[22%] ring-2 ring-zinc-900 dark:ring-zinc-100"
          />
        ))}
        <span className="grid h-9 w-9 place-items-center rounded-[22%] border-2 border-dashed border-zinc-600 text-zinc-300 dark:border-zinc-400 dark:text-zinc-600">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>
      <h2 id="closing-cta" className="font-heading text-2xl font-bold leading-tight sm:text-[34px] break-keep">다음 아이콘은 내 프로젝트로.</h2>
      <p className="max-w-[36ch] text-sm leading-relaxed text-zinc-400 sm:text-base dark:text-zinc-600 break-keep">
        과제로 만든 것, 동아리에서 쓰는 것, 혼자 끄적인 것. 작아도 괜찮아요. 올리면 친구들이 써 보고 말을 걸어요.
      </p>
      <div className="mt-4 flex w-full max-w-[280px] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row">
        <Link
          href="/projects/new"
          prefetch={true}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 rounded-full bg-blue-600 px-7 text-sm text-white hover:bg-blue-700 active:scale-[0.96] transition-[background-color,scale] sm:text-base",
          )}
        >
          <Rocket className="mr-2 h-4 w-4" aria-hidden />
          내 프로젝트 등록하기
        </Link>
        <Link
          href="/guide"
          prefetch={true}
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "h-12 rounded-full border-zinc-600 bg-transparent px-7 text-sm text-white hover:bg-zinc-800 active:scale-[0.96] transition-[background-color,scale] sm:text-base",
            "dark:border-zinc-400 dark:text-zinc-900 dark:hover:bg-zinc-200",
          )}
        >
          만드는 법부터 보기
        </Link>
      </div>
    </div>
  );
}
