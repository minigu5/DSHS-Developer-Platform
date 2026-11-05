"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { FAVORITES_PREVIEW } from "@/lib/hearts";
import { cn } from "@/lib/utils";
import type { ProjectCardData } from "@/components/projects/project-card";

interface FavoritesSectionProps {
  projects: ProjectCardData[];
  renderCard: (project: ProjectCardData) => ReactNode;
}

/** 탐색 맨 위 "즐겨찾기" — 처음엔 한 줄(2장), 나머지는 "N개 더 보기"로 펼친다. */
export function FavoritesSection({ projects, renderCard }: FavoritesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hidden = projects.length - FAVORITES_PREVIEW;
  const shown = expanded ? projects : projects.slice(0, FAVORITES_PREVIEW);

  return (
    <section aria-labelledby="favorites-title" className="mb-8 border-b border-zinc-200 pb-8 dark:border-zinc-800">
      <h2 id="favorites-title" className="mb-4 font-heading text-lg font-bold text-zinc-900 dark:text-white">
        즐겨찾기
        <span className="ml-1.5 text-sm font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">{projects.length}</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* renderCard 가 key 를 붙인다(카드가 격자 칸 높이를 채우게 감싸지 않음) */}
        {shown.map((p) => renderCard(p))}
      </div>
      {hidden > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
          >
            {expanded ? "접기" : `${hidden}개 더 보기`}
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
