import Link from "@/components/shared/link";
import { redirect } from "next/navigation";
import { Globe, Plus, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PageHero } from "@/components/shared/page-hero";
import { DomainList } from "@/components/domains/domain-list";
import { isDeveloper } from "@/lib/constants";
import { naruGuideKind } from "@/lib/domains/list-state";
import { hostParamIsNaru, naruServerIdOf } from "@/lib/domains/next-path";
import { LIVE_STATUSES, listMyDomainProjects } from "@/lib/domains/read";
import { SECTION_COLORS } from "@/lib/section-colors";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// 사용자마다 다르고, 연결 확인 결과가 바로 보여야 한다
export const dynamic = "force-dynamic";

export const metadata = {
  title: "도메인 마련하기 — DSHS Developer Platform",
};

const MAX_DOMAINS = 3;

export default async function DomainsPage({ searchParams }: { searchParams: Promise<{ project?: string; naru?: string; host?: string }> }) {
  const { project: requested, naru, host } = await searchParams;
  // 대곽나루 서버 카드의 "dshs.dev 주소 받기"로 들어온 경우(?naru=<서버 id>) — 형식이 아니면 없는 것으로
  const naruServerId = naruServerIdOf(naru);
  // 연결 방법 고르기(?host=naru)가 새로고침에 사라지지 않게 주소에 남겨 둔 값
  const naruHost = hostParamIsNaru(host);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = new URLSearchParams();
    if (naruServerId) back.set("naru", naruServerId);
    if (requested) back.set("project", requested);
    if (naruHost) back.set("host", "naru");
    const query = back.toString();
    redirect(`/login?next=${encodeURIComponent(query ? `/domains?${query}` : "/domains")}`);
  }

  const rows = await listMyDomainProjects(user.id);
  const used = rows.filter((r) => r.domain && LIVE_STATUSES.includes(r.domain.status)).length;
  // 등록 직후 "도메인 마련하기"로 왔을 때(?project=) 그 줄을 펼친다 — 내 목록에 있고 아직 주소가 없을 때만
  // 대곽나루 흐름에서는 방문 주소가 없어도 된다
  const openable = (r: (typeof rows)[number]) => (naruServerId || r.project.url) && !r.domain && used < MAX_DOMAINS;
  const openRow = rows.find((r) => r.project.id === requested && openable(r));
  // 대곽나루 흐름에서 줄이 하나뿐(주소 받을 수 있는 프로젝트 하나)이면 그 줄을 바로 연다
  const naruCandidates = naruServerId ? rows.filter(openable) : [];
  // 웹사이트 프로젝트는 있지만 어느 것도 주소를 받을 수 없으면(이미 주소 있음·3개 한도) 고를 게 없다 → 새 프로젝트를 등록하게 한다
  // 주소를 이미 3개 쓰고 있으면 새 프로젝트를 등록해도 못 받는다 → 등록 버튼 대신 한도 안내
  const guide = naruGuideKind({ naruServerId, rowCount: rows.length, candidates: naruCandidates.length, used, max: MAX_DOMAINS });
  const needsNewProject = guide === "no-project" || guide === "new-project";
  const initialOpen = openRow?.project.id ?? (naruCandidates.length === 1 && rows.length === 1 ? naruCandidates[0].project.id : null);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="domains"
        icon={Globe}
        title="도메인 마련하기"
        description="내 웹사이트에 이름.dshs.dev 주소를 붙여요"
        actions={
          isDeveloper(user.email) ? (
            <Link href="/domains/admin" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-full px-4 text-sm")}>
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />
              전체 주소
            </Link>
          ) : undefined
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-heading text-lg font-semibold text-zinc-900 dark:text-zinc-100">내 웹사이트 프로젝트</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            주소 <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{used}</span> / {MAX_DOMAINS}
          </p>
        </div>

        {naruServerId && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 sm:flex-row sm:items-center dark:border-teal-900 dark:bg-teal-950/40">
            <p className="flex-1 text-sm text-teal-900 dark:text-teal-200">
              {guide === "no-project" ? (
                <>
                  <span className="font-semibold">먼저 웹사이트 프로젝트를 등록해요.</span> 등록하고 나면 대곽나루 서버에 주소를 붙일 수 있어요. 방문 주소는 비워도 돼요.
                </>
              ) : guide === "limit" ? (
                <>주소는 한 사람당 {MAX_DOMAINS}개까지라 더 받을 수 없어요. 안 쓰는 주소를 반납하면 받을 수 있어요.</>
              ) : guide === "new-project" ? (
                <>
                  <span className="font-semibold">주소를 받을 수 있는 프로젝트가 없어요.</span> 공개 웹사이트 프로젝트를 새로 등록하면 대곽나루 서버에 주소를 붙일 수 있어요.
                </>
              ) : (
                <>
                  <span className="font-semibold">대곽나루 서버에 붙일 프로젝트를 골라요.</span> 주소가 아직 없는 프로젝트의 버튼을 누르면 대곽나루로 미리 골라져 있어요.
                </>
              )}
            </p>
            {needsNewProject && (
              <Link
                href={`/projects/new?type=website&next=${encodeURIComponent(`/domains?naru=${naruServerId}`)}`}
                className={cn(buttonVariants(), "h-9 rounded-full px-4 text-sm", SECTION_COLORS.domains.button)}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden />
                프로젝트 등록하기
              </Link>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          naruServerId ? null : <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">웹사이트 프로젝트를 등록하면 주소를 받을 수 있어요.</p>
            <Link href="/projects/new" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-full px-4 text-sm")}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              프로젝트 등록하기
            </Link>
          </div>
        ) : (
          <DomainList rows={rows} limitReached={used >= MAX_DOMAINS} initialOpen={initialOpen} naruServerId={naruServerId} initialNaru={naruHost} />
        )}

        <p className="mt-8 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          주소는 한 사람당 {MAX_DOMAINS}개까지, 웹사이트 프로젝트마다 하나씩 받을 수 있어요. 매일 한 번 연결을 확인하고, 7일 넘게 끊겨 있으면 자동으로 반납돼요. 대곽나루 서버에 붙인 주소는 서버가 없어질 때만 반납돼요.
          부적절한 이름이나 사이트는 관리자가 회수할 수 있어요.
        </p>
      </main>
    </div>
  );
}
