// /admin 「잠긴 프로젝트」 — 관리자가 비공개로 잠근 프로젝트 목록. 풀면 비공개는 그대로, 공개는 주인이 직접(2026-11-07)

import Link from "@/components/shared/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { UnlockButton } from "@/components/admin/lock-dialog";
import type { LockedProjectView } from "@/lib/admin/read";

export function LockedProjects({ locks }: { locks: LockedProjectView[] }) {
  if (locks.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">잠긴 프로젝트가 없어요. 프로젝트 상세의 &ldquo;잠그고 비공개로&rdquo;로 잠글 수 있어요.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {locks.map((l) => (
        <li key={l.projectId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Link href={`/projects/${l.projectId}`} className="truncate text-sm font-semibold text-zinc-900 underline-offset-4 hover:underline dark:text-white">
              {l.title}
            </Link>
            <p className="mt-0.5 text-xs break-keep text-zinc-500">
              {formatDistanceToNow(new Date(l.lockedAt), { addSuffix: true, locale: ko })} 잠금 · {l.reason ?? "이유 없음"}
            </p>
          </div>
          <UnlockButton projectId={l.projectId} className="self-start sm:self-auto" />
        </li>
      ))}
    </ul>
  );
}
