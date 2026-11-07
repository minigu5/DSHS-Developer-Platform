import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { BanList } from "@/components/admin/ban-list";
import { ContentFeed } from "@/components/admin/content-feed";
import { HungPosters } from "@/components/admin/hung-posters";
import { LockedProjects } from "@/components/admin/locked-projects";
import { StatGrid } from "@/components/admin/stat-grid";
import { TodayList } from "@/components/admin/today-list";
import { AdminDomainTable } from "@/components/domains/admin-domain-table";
import { PageHero } from "@/components/shared/page-hero";
import { isDeveloper } from "@/lib/constants";
import { loadAdminDashboard } from "@/lib/admin/read";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "관리자 — DSHS Developer Platform",
  robots: { index: false },
};

function SectionTitle({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div id={id} className="mb-3 flex scroll-mt-24 items-end justify-between gap-2">
      <h2 className="font-heading text-xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h2>
      {note && <p className="text-xs text-zinc-500 dark:text-zinc-400">{note}</p>}
    </div>
  );
}

// 관리자(개발자 계정) 전용 — 아니면 404. 하루 한 번 훑어보고 줄에서 바로 대응한다(설계 2026-11-05)
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isDeveloper(user.email)) notFound();

  const data = await loadAdminDashboard();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="admin" icon={ShieldCheck} title="관리자" description="오늘 확인할 것과 사이트 현황을 보고, 문제가 있으면 바로 처리해요" />
      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-[minmax(0,1fr)] gap-10 px-6 py-9">
        <section>
          <SectionTitle id="today" title="오늘 확인할 것" note={data.today.length ? `${data.today.length}건` : undefined} />
          <TodayList items={data.today} />
        </section>
        <section>
          <SectionTitle id="stats" title="사이트 현황" note="한국 시간 기준" />
          <StatGrid stats={data.stats} />
        </section>
        <section>
          <SectionTitle id="feed" title="최신 글" note="비속어는 빨갛게 표시돼요" />
          <ContentFeed initial={data.feed} />
        </section>
        <section>
          <SectionTitle id="posters" title="걸린 포스터" note="올리면 바로 걸려요 · 최근 20개" />
          <HungPosters posters={data.hungPosters} />
        </section>
        <section>
          <SectionTitle id="locks" title="잠긴 프로젝트" note="만든 사람은 다시 공개할 수 없어요" />
          <LockedProjects locks={data.lockedProjects} />
        </section>
        <section>
          <SectionTitle id="bans" title="차단" />
          <BanList bans={data.bans} />
        </section>
        <section>
          <SectionTitle id="domains" title="주소 관리" />
          {data.domains.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              아직 받은 주소가 없어요.
            </p>
          ) : (
            <AdminDomainTable rows={data.domains} />
          )}
        </section>
      </main>
    </div>
  );
}
