import { redirect } from "next/navigation";
import { ChevronRight, Megaphone } from "lucide-react";

import Link from "@/components/shared/link";
import { PageHero } from "@/components/shared/page-hero";
import { ProjectIcon } from "@/components/projects/project-icon";
import { posterStartTarget } from "@/lib/posters/hang-logic";
import { createClient } from "@/lib/supabase/server";

// 남의 상세 페이지에서 포스터를 크게 보다가 "내 프로젝트로도 만들 수 있어요"를 누르면 오는 곳.
// 내가 고칠 수 있는 공개 프로젝트(내 것 + 팀원으로 들어간 것)가 없으면 등록으로, 하나면 그 수정 화면의 포스터 칸으로, 여럿이면 고르게 한다.
export default async function PosterStartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/posters/start");

  // author_id 는 사용자 키로 못 읽는다(익명 프로젝트 보호) — 내 것은 my_project_ids() 로
  const [{ data: mine }, { data: team }] = await Promise.all([
    supabase.rpc("my_project_ids"),
    user.email
      ? supabase.from("projects").select("id").contains("team_members", [user.email])
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const ids = [...new Set([...((mine as string[] | null) ?? []), ...(team ?? []).map((p) => p.id)])];
  const { data: rows } = ids.length
    ? await supabase
        .from("projects")
        .select("id, title, icon_url, icon_fit")
        .in("id", ids)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; title: string; icon_url: string | null; icon_fit: unknown }[] };
  const projects = rows ?? [];

  const target = posterStartTarget(projects.map((p) => p.id));
  if (target.kind === "new") redirect("/projects/new");
  if (target.kind === "one") redirect(`/projects/${target.id}/edit?poster=list`);

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-950">
      <PageHero section="new" icon={Megaphone} variant="compact" title="어느 프로젝트 포스터를 만들까요?" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}/edit?poster=list`}
                className="flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <ProjectIcon src={p.icon_url} fit={p.icon_fit} title={p.title} decorative className="h-11 w-11 shrink-0 rounded-[22%]" />
                <span className="min-w-0 flex-1 truncate font-semibold text-zinc-900 dark:text-white">{p.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
