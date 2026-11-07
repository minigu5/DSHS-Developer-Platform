"use client";

// /admin 「걸린 포스터」 — 학생이 올린 그림은 바로 상세 페이지에 걸리고 관리자가 나중에 본다(2026-11-07 사용자 결정).
// 내리기 = 상세에서만 내림(포스터 자체는 남음). 올린 사람 차단은 프로젝트 기준(누가 걸었는지는 따로 남기지 않아 프로젝트 주인을 막는다).

import Link from "@/components/shared/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { ConfirmAction } from "@/components/admin/confirm-action";
import { BanButton } from "@/components/admin/ban-dialog";
import { adminBanByContent, adminUnhangPoster } from "@/lib/admin/actions";
import type { HungPosterView } from "@/lib/admin/read";
import { posterImageAt } from "@/lib/posters/hang-logic";

export function HungPosters({ posters }: { posters: HungPosterView[] }) {
  if (posters.length === 0) return <p className="text-sm text-zinc-600 dark:text-zinc-400">아직 걸린 포스터가 없어요.</p>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {posters.map((p) => (
        <li key={p.projectId} className="flex flex-col gap-2">
          <a href={p.imageUrl} target="_blank" rel="noreferrer" aria-label={`${p.title} 포스터 원본 보기`} className="block overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본 */}
            <img src={posterImageAt(p.imageUrl, 480)} alt="" loading="lazy" className="aspect-[210/297] w-full bg-zinc-50 object-contain dark:bg-zinc-900" />
          </a>
          <Link href={`/projects/${p.projectId}`} className="truncate text-sm font-semibold text-zinc-900 underline-offset-4 hover:underline dark:text-white">
            {p.title}
          </Link>
          <p className="text-xs text-zinc-500">
            {p.isAi ? "AI 포스터" : "올린 그림"}
            {p.hungAt && ` · ${formatDistanceToNow(new Date(p.hungAt), { addSuffix: true, locale: ko })}`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <ConfirmAction
              label="내리기"
              title="이 포스터를 내릴까요?"
              description="프로젝트 상세 페이지에서만 내려요. 포스터는 주인의 포스터 화면에 남아요."
              confirmLabel="내리기"
              success="포스터를 내렸어요."
              action={() => adminUnhangPoster(p.projectId)}
            />
            <BanButton label="주인 차단" who={null} onBan={(duration, reason) => adminBanByContent("project", p.projectId, duration, reason)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
