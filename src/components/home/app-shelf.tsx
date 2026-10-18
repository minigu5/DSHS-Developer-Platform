import type { CSSProperties } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProjectIcon } from "@/components/projects/project-icon";

export type ShelfApp = {
  id: string;
  title: string;
  icon_url: string | null;
};

// 홈 히어로의 "앱 진열대" — 실제 학생 프로젝트 아이콘을 폰 홈 화면처럼 늘어놓는다.
// 아이콘 radius 14px(64px의 22%) + 패딩 24px = 바깥 radius 38px (동심 radius)
export function AppShelf({ apps }: { apps: ShelfApp[] }) {
  return (
    <div className="rounded-[38px] bg-zinc-100 p-6 dark:bg-zinc-900">
      <ul className="grid grid-cols-4 gap-x-3 gap-y-5">
        {apps.map((app, i) => (
          <li key={app.id} className="app-pop" style={{ "--pop-delay": `${i * 40}ms` } as CSSProperties}>
            <Link
              href={`/projects/${app.id}`}
              title={app.title}
              className="group flex flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <ProjectIcon
                src={app.icon_url}
                title={app.title}
                decorative
                className="h-16 w-16 rounded-[22%] transition-[scale] duration-150 group-active:scale-[0.96]"
              />
              <span className="w-full truncate text-center text-xs text-zinc-700 dark:text-zinc-300">
                {app.title}
              </span>
            </Link>
          </li>
        ))}
        <li className="app-pop" style={{ "--pop-delay": `${apps.length * 40}ms` } as CSSProperties}>
          <Link
            href="/projects/new"
            className="group flex flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-[22%] border-2 border-dashed border-zinc-300 text-zinc-500 transition-[scale,border-color,color] duration-150 group-hover:border-zinc-400 group-hover:text-zinc-700 group-active:scale-[0.96] dark:border-zinc-700 dark:text-zinc-400 dark:group-hover:border-zinc-500 dark:group-hover:text-zinc-200">
              <Plus className="h-6 w-6" aria-hidden />
            </span>
            <span className="w-full truncate text-center text-xs text-zinc-600 dark:text-zinc-400">내 앱 올리기</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
