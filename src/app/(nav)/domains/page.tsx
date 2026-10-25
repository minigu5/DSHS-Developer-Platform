import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Plus, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PageHero } from "@/components/shared/page-hero";
import { DomainList } from "@/components/domains/domain-list";
import { isDeveloper } from "@/lib/constants";
import { LIVE_STATUSES, listMyDomainProjects } from "@/lib/domains/read";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// 사용자마다 다르고, 연결 확인 결과가 바로 보여야 한다
export const dynamic = "force-dynamic";

export const metadata = {
  title: "도메인 마련하기 — DSHS Developer Platform",
};

const MAX_DOMAINS = 3;

export default async function DomainsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/domains");

  const rows = await listMyDomainProjects(user.id);
  const used = rows.filter((r) => r.domain && LIVE_STATUSES.includes(r.domain.status)).length;

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

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">웹사이트 프로젝트를 등록하면 주소를 받을 수 있어요.</p>
            <Link href="/projects/new" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-full px-4 text-sm")}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              프로젝트 등록하기
            </Link>
          </div>
        ) : (
          <DomainList rows={rows} limitReached={used >= MAX_DOMAINS} />
        )}

        <p className="mt-8 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          주소는 한 사람당 {MAX_DOMAINS}개까지, 웹사이트 프로젝트마다 하나씩 받을 수 있어요. 매일 한 번 연결을 확인하고, 7일 넘게 끊겨 있으면 자동으로 반납돼요.
          부적절한 이름이나 사이트는 관리자가 회수할 수 있어요.
        </p>
      </main>
    </div>
  );
}
