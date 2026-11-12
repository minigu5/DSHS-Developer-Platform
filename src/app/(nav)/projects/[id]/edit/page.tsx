import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Rocket } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { ProjectForm } from "@/components/projects/project-form";
import { PosterSheet } from "@/components/posters/poster-sheet";
import { isDeveloper } from "@/lib/constants";
import { getConnectedDomainUrl, getLiveDomain, getOldAddressSource } from "@/lib/domains/read";
import { oldAddressPrefixes } from "@/lib/domains/old-address";
import { PROJECT_COLUMNS } from "@/lib/projects/columns";
import { getProjectLock } from "@/lib/projects/lock";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth — getSession()은 쿠키 값을 검증 없이 돌려주므로, 서비스 키 사용 여부를 정하는 여기서는 getUser()로 확인한다
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const userIsDeveloper = isDeveloper(user.email);

  // 개발자 계정은 비공개 프로젝트도 조회할 수 있도록 어드민 클라이언트 사용
  const queryClient = userIsDeveloper ? createAdminClient() : supabase;

  // Fetch project
  const { data: project, error } = await queryClient
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Check ownership — 개발자 계정·팀원도 수정 가능. author_id 는 사용자 키로 못 읽으므로(익명 프로젝트 보호) my_project_ids() 로 본인 것인지 본다
  const isTeamMember = project.team_members?.includes(user.email ?? "") ?? false;
  const isOwnProject = ((await supabase.rpc('my_project_ids')).data ?? []).includes(project.id);
  if (!userIsDeveloper && !isOwnProject && !isTeamMember) {
    redirect(`/projects/${id}`);
  }

  const isAuthor = isOwnProject || userIsDeveloper;
  const subdomainName = isAuthor ? ((await getLiveDomain(project.id))?.name ?? null) : null;
  // 도메인이 연결된 동안 방문 주소는 그 주소로 고정 — 팀원에게도 잠긴 칸을 보여 준다
  const domainUrl = await getConnectedDomainUrl(project.id);
  // 연결된 주소가 있으면 설명 속 옛 사이트 주소를 폼이 찾아 바꿀지 묻는다(상세 페이지 OldAddressNudge 와 같은 조건)
  const source = subdomainName ? await getOldAddressSource(project.id) : null;
  const oldAddress = source ? { name: source.name, prefixes: oldAddressPrefixes(source) } : null;
  // 관리자가 잠갔으면 공개로 못 바꾼다(DB 가드가 최종) — 주인·팀원·관리자 확인을 지난 뒤라 이유를 보여 줘도 된다
  const lock = project.visibility === "private" ? await getProjectLock(project.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="new" icon={Rocket} title="프로젝트 수정" description="프로젝트의 최신 정보를 반영해요." />
      <main className="w-full flex-1 px-6 py-9">
        <ProjectForm initialData={project} isEdit={true} canDelete={isAuthor} subdomainName={subdomainName} domainUrl={domainUrl} oldAddress={oldAddress} lock={lock} />
      </main>
      {/* 홍보 포스터 옆 칸 — `?poster=` 가 있으면 열린다(공개 프로젝트만 포스터를 건다) */}
      {project.visibility === "public" && (
        <Suspense fallback={null}>
          <PosterSheet projectId={project.id} projectTitle={project.title} />
        </Suspense>
      )}
    </div>
  );
}
