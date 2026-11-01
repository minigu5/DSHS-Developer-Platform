import { Rocket } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { ProjectForm } from "@/components/projects/project-form";
import { safeDomainsNext } from "@/lib/domains/next-path";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ type?: string; next?: string }> }) {
  const { type, next } = await searchParams;
  // 도메인 마련하기(대곽나루)에서 넘어온 등록 — 종류 "웹사이트"를 미리 고르고, 등록이 끝나면 /domains 로 돌아간다(안쪽 /domains 경로만)
  const nextHref = safeDomainsNext(next);
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="new"
        icon={Rocket}
        title="프로젝트 등록하기"
        description="직접 만든 프로그램을 올리면 다른 학생들이 써 보고 리뷰를 남길 수 있어요."
      />
      <main className="w-full flex-1 px-6 py-9">
        <ProjectForm initialType={type === "website" ? "website" : null} nextHref={nextHref} />
      </main>
    </div>
  );
}
