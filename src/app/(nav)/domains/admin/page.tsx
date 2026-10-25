import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AdminDomainTable } from "@/components/domains/admin-domain-table";
import { PageHero } from "@/components/shared/page-hero";
import { isDeveloper } from "@/lib/constants";
import { listAllSubdomains } from "@/lib/domains/read";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "전체 주소 — DSHS Developer Platform",
};

// 관리자(개발자 계정) 전용 — 부적절한 이름·사이트 회수, 회수한 이름 풀기
export default async function DomainsAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/domains/admin");
  if (!isDeveloper(user.email)) notFound();

  const rows = await listAllSubdomains();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="domains" icon={ShieldCheck} title="전체 주소" description="학생들이 받은 주소를 보고, 문제가 있으면 회수해요" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <Link href="/domains" className="mb-5 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          도메인 마련하기
        </Link>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            아직 받은 주소가 없어요.
          </p>
        ) : (
          <AdminDomainTable rows={rows} />
        )}
      </main>
    </div>
  );
}
