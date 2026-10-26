import { notFound, redirect } from "next/navigation";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Rocket } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { ProjectForm } from "@/components/projects/project-form";
import { isDeveloper } from "@/lib/constants";
import { getLiveDomainName } from "@/lib/domains/read";

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
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Check ownership — 개발자 계정·팀원도 수정 가능
  const isTeamMember = project.team_members?.includes(user.email ?? "") ?? false;
  if (!userIsDeveloper && project.author_id !== user.id && !isTeamMember) {
    redirect(`/projects/${id}`);
  }

  const isAuthor = project.author_id === user.id || userIsDeveloper;
  const subdomainName = isAuthor ? await getLiveDomainName(project.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="new" icon={Rocket} title="프로젝트 수정" description="프로젝트의 최신 정보를 반영해요." />
      <main className="w-full flex-1 px-6 py-9">
        <ProjectForm initialData={project} isEdit={true} canDelete={isAuthor} subdomainName={subdomainName} />
      </main>
    </div>
  );
}
