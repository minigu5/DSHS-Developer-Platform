import type { CSSProperties } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProjectIcon } from "@/components/projects/project-icon";

export type TableProject = {
  id: string;
  title: string;
  icon_url: string | null;
  type: string;
};

// 주기율표처럼 채우는 칸 순서(6열). 1~2주기처럼 양끝부터 채우고 가운데(3열)를 비워 둔다.
// 마지막 칸은 항상 "내 앱 올리기"라서 실제 프로젝트는 SLOTS.length - 1 개까지만 보인다.
const SLOTS: ReadonlyArray<readonly [col: number, row: number]> = [
  [1, 1], [6, 1],
  [1, 2], [2, 2], [4, 2], [5, 2], [6, 2],
  [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
];
export const TABLE_CAPACITY = SLOTS.length - 1;

// 로딩 시퀀스 타이밍 — 제목·설명·버튼(0/90/180ms)이 올라온 뒤 타일이 등록 순으로 하나씩 등장
const FIRST_TILE_DELAY = 260;
const TILE_STAGGER = 65;

// 종류별 색 — ProjectIcon 폴백 타일과 같은 어휘(100 배경 + 800 글자). 범례 라벨은 짧은 이름을 쓴다.
const TYPE_TINTS: Record<string, { label: string; tile: string; swatch: string }> = {
  website: {
    label: "웹사이트",
    tile: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    swatch: "bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-800",
  },
  app: {
    label: "앱",
    tile: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    swatch: "bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800",
  },
  extension: {
    label: "확장프로그램",
    tile: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    swatch: "bg-purple-100 border-purple-300 dark:bg-purple-950 dark:border-purple-800",
  },
  cli: {
    label: "CLI",
    tile: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    swatch: "bg-amber-100 border-amber-300 dark:bg-amber-950 dark:border-amber-800",
  },
  library: {
    label: "라이브러리",
    tile: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    swatch: "bg-rose-100 border-rose-300 dark:bg-rose-950 dark:border-rose-800",
  },
};
const FALLBACK_TINT = {
  label: "기타",
  tile: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  swatch: "bg-zinc-100 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600",
};

function tintFor(type: string) {
  return TYPE_TINTS[type] ?? FALLBACK_TINT;
}

function slotStyle(index: number, delay: number): CSSProperties {
  const [col, row] = SLOTS[index];
  return { gridColumn: col, gridRow: row, "--pop-delay": `${delay}ms` } as CSSProperties;
}

const TILE_CLASS =
  "flex aspect-[96/108] flex-col items-center justify-between rounded-xl p-1.5 pb-2 [container-type:inline-size] " +
  "outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-150 hover:outline-zinc-900 dark:hover:outline-zinc-100 " +
  "focus-visible:outline-blue-600";

/**
 * 홈 히어로의 "대곽 프로그램 주기율표" — 공개 프로젝트를 등록 순으로 원소 타일처럼 늘어놓는다.
 * 타일: 우상단 등록 번호, 중앙 큰 아이콘, 하단 이름. 마지막 칸은 "내 앱 올리기".
 */
export function PeriodicTable({ projects }: { projects: TableProject[] }) {
  const shown = projects.slice(0, TABLE_CAPACITY);
  const presentTypes = Object.keys(TYPE_TINTS).filter((t) => shown.some((p) => p.type === t));
  const plusDelay = FIRST_TILE_DELAY + shown.length * TILE_STAGGER + 55;

  return (
    <div className="flex flex-col gap-3.5">
      <ul aria-label="등록된 프로젝트" className="grid grid-cols-6 gap-2">
        {shown.map((project, i) => {
          const tint = tintFor(project.type);
          return (
            <li key={project.id} className="tile-pop" style={slotStyle(i, FIRST_TILE_DELAY + i * TILE_STAGGER)}>
              <Link href={`/projects/${project.id}`} className={cn(TILE_CLASS, tint.tile)}>
                <span aria-hidden className="self-end font-mono text-[11px] leading-none tabular-nums">
                  {i + 1}
                </span>
                <ProjectIcon
                  src={project.icon_url}
                  title={project.title}
                  decorative
                  className="tile-icon h-[58cqi] w-[58cqi] rounded-[22%]"
                />
                <span className="w-full truncate text-center text-[10px] leading-tight">{project.title}</span>
              </Link>
            </li>
          );
        })}

        <li className="tile-pop" style={slotStyle(shown.length, plusDelay)}>
          <Link
            href="/projects/new"
            className={cn(
              TILE_CLASS,
              "tile-invite border-2 border-dashed border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400",
            )}
          >
            <span aria-hidden className="self-end font-mono text-[11px] leading-none tabular-nums">
              {shown.length + 1}
            </span>
            <span
              aria-hidden
              className="tile-icon flex h-[58cqi] w-[58cqi] items-center justify-center rounded-[22%] bg-zinc-100 dark:bg-zinc-800"
            >
              <Plus className="h-[45%] w-[45%]" strokeWidth={2.5} />
            </span>
            <span className="w-full truncate text-center text-[10px] leading-tight">내 앱 올리기</span>
          </Link>
        </li>
      </ul>

      {presentTypes.length > 0 && (
        <ul
          aria-label="종류별 색"
          className="rise flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-700 dark:text-zinc-300"
          style={{ "--rise-delay": `${plusDelay + 150}ms` } as CSSProperties}
        >
          {presentTypes.map((type) => {
            const tint = tintFor(type);
            return (
              <li key={type} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("h-3 w-3 rounded border", tint.swatch)} />
                {tint.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
