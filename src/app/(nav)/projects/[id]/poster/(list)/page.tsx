import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Megaphone } from "lucide-react";

import Link from "@/components/shared/link";
import { PageHero } from "@/components/shared/page-hero";
import { PosterPreview } from "@/components/posters/poster-preview";
import {
  DeletePosterButton,
  NewPosterButton,
} from "@/components/posters/poster-list-actions";
import { PosterBandDownload } from "@/components/posters/poster-band-download";
import { PosterHangButton } from "@/components/posters/poster-hang-button";
import { PosterUploadButton } from "@/components/posters/poster-upload-button";
import { getBandAccess } from "@/lib/posters/access";
import { POSTER_LIMITS } from "@/lib/posters/config";
import { canHangPoster, hangState, hungIsStale, posterImageAt } from "@/lib/posters/hang-logic";
import { kstDate } from "@/lib/posters/kst";
import { createAdminClient } from "@/lib/supabase/server";

export default async function PosterListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 띠 받기·포스터 올리기·걸기는 수정할 수 있는 사람 누구나, AI 만들기는 access.canUseAi 일 때만
  const access = await getBandAccess(id);
  if (access === "login") redirect(`/login?next=/projects/${id}/poster`);
  if (typeof access === "string") notFound();

  // 서비스 키 전용 표·칸 — 위에서 권한을 확인했다
  const admin = createAdminClient();
  const today = kstDate();
  const [{ data }, { data: madeToday }, { data: project }] = await Promise.all([
    admin
      .from("project_posters")
      .select("id, kind, html, art_url, art_job_id, image_url, band_tone, band_position, updated_at")
      .eq("project_id", id)
      .order("updated_at", { ascending: false }),
    admin
      .from("project_poster_days")
      .select("day")
      .eq("project_id", id)
      .eq("day", today)
      .maybeSingle(),
    admin.from("projects").select("poster_id, poster_hung_at, poster_image_url").eq("id", id).maybeSingle(),
  ]);
  const posters = data ?? [];
  const full = posters.length >= POSTER_LIMITS.perProject;
  const hungId = project?.poster_id ?? null;
  // AI 포스터는 걸고 나서 PNG 를 뒤에서 찍는다 — 그동안 "거는 중", 2분 넘게 없으면 "다시 걸기"
  // eslint-disable-next-line react-hooks/purity -- 요청마다 새로 그리는 서버 페이지
  const hung = hungId ? hangState({ imageUrl: project?.poster_image_url ?? null, hungAt: project?.poster_hung_at ?? null }, Date.now()) : null;

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="new"
        icon={Megaphone}
        variant="compact"
        title={`${access.project.title} 홍보 포스터`}
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-9">
        <PosterBandDownload title={access.project.title} projectId={id} />
        <section aria-labelledby="posters-title" className="flex flex-col gap-5">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2
                id="posters-title"
                className="font-heading text-xl font-semibold text-zinc-900 dark:text-white"
              >
                상세 페이지에 걸 포스터
              </h2>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                {access.canUseAi
                  ? "직접 만든 포스터 그림을 올리거나 AI로 만들 수 있어요. 하나를 골라 걸면 프로젝트 페이지에 보여요."
                  : "직접 만든 포스터 그림을 올리면 프로젝트 페이지에 걸 수 있어요."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PosterUploadButton projectId={id} full={full} hangIfNone={!hungId} />
              {access.canUseAi && (
                <NewPosterButton projectId={id} disabled={full || !!madeToday} />
              )}
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {hungId
              ? "지금 걸린 포스터에 '걸려 있어요' 표시가 있어요."
              : "아직 걸린 포스터가 없어요. 아래에서 하나를 골라 걸어 보세요."}
            {full
              ? ` 포스터는 ${POSTER_LIMITS.perProject}개까지예요. 하나를 지우면 올리거나 만들 수 있어요.`
              : access.canUseAi && madeToday && " AI 포스터는 하루에 하나 새로 만들 수 있어요. 만든 포스터는 계속 고칠 수 있어요."}
          </p>
          {posters.length === 0 ? (
            <p className="text-center text-zinc-600 dark:text-zinc-400">
              아직 포스터가 없어요.{" "}
              {access.canUseAi
                ? "포스터 그림을 올리거나, 새로 만들기를 누르면 AI가 학교에 붙일 홍보 포스터를 만들어 줘요."
                : "학교 게시판에 붙일 포스터 그림을 올려 보세요."}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {posters.map((p) => (
                <li key={p.id} className="flex flex-col gap-2">
                  {p.kind === "upload" ? (
                    // 직접 올린 그림은 비율이 제각각이라 A4 비율 상자 안에 맞춘다
                    <a
                      href={p.image_url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="올린 포스터 원본 보기"
                      className="flex aspect-[210/297] items-center justify-center overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본, 상세 아이콘과 같은 방식 */}
                      <img src={p.image_url ? posterImageAt(p.image_url, 640) : ""} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </a>
                  ) : (
                    <Link
                      href={`/projects/${id}/poster/${p.id}`}
                      aria-label="포스터 열기"
                      className="block rounded-2xl"
                    >
                      <PosterPreview
                        html={p.html}
                        artUrl={p.art_url}
                        title={access.project.title}
                        projectId={id}
                        tone={p.band_tone}
                        position={p.band_position}
                      />
                    </Link>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <PosterHangButton
                      posterId={p.id}
                      projectId={id}
                      hung={p.id === hungId ? hung : null}
                      stale={p.id === hungId && hung === "hung" && p.kind === "ai" && hungIsStale(project?.poster_hung_at ?? null, p.updated_at)}
                      disabled={!canHangPoster(p)}
                    />
                    <DeletePosterButton posterId={p.id} />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {p.kind === "upload" ? "올린 그림 · " : "AI 포스터 · "}
                    {formatDistanceToNow(new Date(p.updated_at), {
                      addSuffix: true,
                      locale: ko,
                    })}{" "}
                    {p.kind === "upload" ? "올림" : "수정"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="text-center">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            프로젝트로 돌아가기
          </Link>
        </p>
      </main>
    </div>
  );
}
