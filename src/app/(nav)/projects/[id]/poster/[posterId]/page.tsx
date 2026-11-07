import { notFound, redirect } from "next/navigation";
import { Megaphone } from "lucide-react";

import Link from "@/components/shared/link";
import { PageHero } from "@/components/shared/page-hero";
import { PosterStudio } from "@/components/posters/poster-studio";
import { getPosterAccess } from "@/lib/posters/access";
import { settlePosterJob } from "@/lib/posters/ai-jobs";
import { settleArtJob } from "@/lib/posters/art-jobs";
import { loadPoster, toPosterView } from "@/lib/posters/poster-db";

export default async function PosterStudioPage({ params }: { params: Promise<{ id: string; posterId: string }> }) {
  const { id, posterId } = await params;
  const poster = await loadPoster(posterId);
  // 직접 올린 그림은 스튜디오가 없다 — 열어 두면 AI 로 만들어 '하루 1개'를 피할 수 있다
  if (!poster || poster.project_id !== id || poster.kind !== "ai") notFound();
  const access = await getPosterAccess(id);
  if (access === "login") redirect(`/login?next=/projects/${id}/poster/${posterId}`);
  if (typeof access === "string") notFound();
  // 브라우저를 다 닫은 뒤 막힌 학교 Mac 그림이 "그림 다시 그리기"를 계속 막지 않게 열 때 한 번 정리한다
  // 막혀서 정리됐으면 브라우저가 열자마자 한 번 클라우드로 다시 그린다(탭이 열려 있을 때 폴링이 하던 일)
  const settled = poster.art_job_id ? await settleArtJob(poster) : null;
  // 큐 일감(만들기·고치기)도 막혔으면 정리하고 횟수를 돌려준다 — 아직 돌고 있으면 스튜디오가 이어서 기다린다
  const current = await settlePosterJob(settled?.poster ?? poster);
  const artGaveUp = settled?.status === "expired" || settled?.status === "failed";

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-950">
      <PageHero section="new" icon={Megaphone} variant="compact" title={`${access.project.title} 포스터`} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7">
        <PosterStudio initial={toPosterView(current)} projectTitle={access.project.title} artGaveUp={artGaveUp} />
        <p className="mt-10 text-center">
          <Link href={`/projects/${id}/poster`} className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
            포스터 목록으로
          </Link>
        </p>
      </main>
    </div>
  );
}
