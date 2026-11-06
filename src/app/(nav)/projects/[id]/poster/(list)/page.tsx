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
import { getBandAccess } from "@/lib/posters/access";
import { POSTER_LIMITS } from "@/lib/posters/config";
import { kstDate } from "@/lib/posters/kst";
import { createAdminClient } from "@/lib/supabase/server";

export default async function PosterListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 띠 받기는 수정할 수 있는 사람 누구나, AI 포스터 칸은 access.canUseAi(1단계 관리자)일 때만
  const access = await getBandAccess(id);
  if (access === "login") redirect(`/login?next=/projects/${id}/poster`);
  if (typeof access === "string") notFound();

  // 서비스 키 전용 표 — 위에서 권한을 확인했다
  const admin = createAdminClient();
  const today = kstDate();
  const [{ data }, { data: madeToday }] = access.canUseAi
    ? await Promise.all([
        admin
          .from("project_posters")
          .select("id, html, art_url, band_tone, band_position, updated_at")
          .eq("project_id", id)
          .order("updated_at", { ascending: false }),
        admin
          .from("project_poster_days")
          .select("day")
          .eq("project_id", id)
          .eq("day", today)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const posters = data ?? [];

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
        {access.canUseAi && (
          <section
            aria-labelledby="ai-poster-title"
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2
                  id="ai-poster-title"
                  className="font-heading text-xl font-semibold text-zinc-900 dark:text-white"
                >
                  AI로 포스터 만들기{" "}
                  <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 align-middle text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    실험
                  </span>
                </h2>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  AI가 그림과 제목을 정해 포스터를 만들고, 부탁하면 고쳐 줘요.
                  띠는 자동으로 붙어요.
                </p>
              </div>
              <NewPosterButton
                projectId={id}
                full={posters.length >= POSTER_LIMITS.perProject}
                madeToday={!!madeToday}
              />
            </div>
            {posters.length === 0 ? (
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                아직 만든 포스터가 없어요. 새로 만들기를 누르면 AI가 학교에 붙일
                홍보 포스터를 만들어 줘요.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {posters.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2">
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(p.updated_at), {
                          addSuffix: true,
                          locale: ko,
                        })}{" "}
                        수정
                      </span>
                      <DeletePosterButton posterId={p.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
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
