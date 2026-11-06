import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Megaphone } from "lucide-react";

import Link from "@/components/shared/link";
import { PageHero } from "@/components/shared/page-hero";
import { PosterPreview } from "@/components/posters/poster-preview";
import { DeletePosterButton, NewPosterButton } from "@/components/posters/poster-list-actions";
import { getPosterAccess } from "@/lib/posters/access";
import { POSTER_LIMITS } from "@/lib/posters/config";
import { kstDate } from "@/lib/posters/kst";
import { createAdminClient } from "@/lib/supabase/server";

export default async function PosterListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPosterAccess(id);
  if (access === "login") redirect(`/login?next=/projects/${id}/poster`);
  if (typeof access === "string") notFound();

  // 서비스 키 전용 표 — 위에서 권한을 확인했다
  const admin = createAdminClient();
  const today = kstDate();
  const [{ data }, { data: madeToday }] = await Promise.all([
    admin.from("project_posters").select("id, html, art_url, band_tone, updated_at").eq("project_id", id).order("updated_at", { ascending: false }),
    admin.from("project_poster_days").select("day").eq("project_id", id).eq("day", today).maybeSingle(),
  ]);
  const posters = data ?? [];

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="new"
        icon={Megaphone}
        variant="compact"
        title={`${access.project.title} 포스터`}
        actions={<NewPosterButton projectId={id} full={posters.length >= POSTER_LIMITS.perProject} madeToday={!!madeToday} />}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        {posters.length === 0 ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            아직 만든 포스터가 없어요. 새로 만들기를 누르면 AI가 학교에 붙일 홍보 포스터를 만들어 줘요.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {posters.map((p) => (
              <li key={p.id} className="flex flex-col gap-2">
                <Link href={`/projects/${id}/poster/${p.id}`} aria-label="포스터 열기" className="block rounded-2xl">
                  <PosterPreview html={p.html} artUrl={p.art_url} title={access.project.title} projectId={id} tone={p.band_tone} />
                </Link>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">
                    {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: ko })} 수정
                  </span>
                  <DeletePosterButton posterId={p.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-10 text-center">
          <Link href={`/projects/${id}`} className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
            프로젝트로 돌아가기
          </Link>
        </p>
      </main>
    </div>
  );
}
