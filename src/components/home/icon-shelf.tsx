import type { CSSProperties } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProjectIcon } from "@/components/projects/project-icon";

export type ShelfProject = {
  id: string;
  title: string;
  icon_url: string | null;
};

// 아이콘 11개 + "내 앱 올리기" = 12칸. 모바일(72px, 간격 14px)에서 4칸씩 3줄로 딱 떨어진다.
export const SHELF_LIMIT = 11;

// 로딩 시퀀스 — 제목·설명·버튼(0/90/180ms)이 올라온 뒤 아이콘이 방문 순으로 하나씩 등장
const FIRST_DELAY = 260;
const STAGGER = 65;

const TILE_CLASS =
  "block h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-[22%] ring-[3px] ring-white dark:ring-zinc-950 " +
  "shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] transition-[scale] duration-150 active:scale-[0.96] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600";

function popDelay(ms: number): CSSProperties {
  return { "--pop-delay": `${ms}ms` } as CSSProperties;
}

/**
 * 홈 히어로 아래 아이콘 나열 — 많이 찾는 순(click_count)으로 실제 프로젝트 아이콘을 스티커처럼 늘어놓고
 * 마지막 칸은 "내 앱 올리기". 이름은 안 보이고 aria-label·title로만 제공한다.
 */
export function IconShelf({ projects }: { projects: ShelfProject[] }) {
  const shown = projects.slice(0, SHELF_LIMIT);

  return (
    <ul aria-label="많이 찾는 프로젝트" className="flex flex-wrap justify-center gap-3.5">
      {shown.map((project, i) => (
        <li key={project.id} className="tile-pop" style={popDelay(FIRST_DELAY + i * STAGGER)}>
          <Link href={`/projects/${project.id}`} aria-label={project.title} title={project.title} className={TILE_CLASS}>
            <ProjectIcon src={project.icon_url} title={project.title} decorative className="h-full w-full rounded-[22%]" />
          </Link>
        </li>
      ))}
      <li className="tile-pop" style={popDelay(FIRST_DELAY + shown.length * STAGGER + 55)}>
        <Link
          href="/projects/new"
          aria-label="내 앱 올리기"
          title="내 앱 올리기"
          className={cn(
            TILE_CLASS,
            "tile-invite flex items-center justify-center border-2 border-dashed border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400",
          )}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
        </Link>
      </li>
    </ul>
  );
}
