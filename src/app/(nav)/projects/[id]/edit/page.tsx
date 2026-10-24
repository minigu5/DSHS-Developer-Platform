import { notFound, redirect } from "next/navigation";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Rocket } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { ProjectForm } from "@/components/projects/project-form";
import { isDeveloper } from "@/lib/constants";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }

  const userIsDeveloper = isDeveloper(session.user.email);

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
  const isTeamMember = project.team_members?.includes(session.user.email ?? "") ?? false;
  if (!userIsDeveloper && project.author_id !== session.user.id && !isTeamMember) {
    redirect(`/projects/${id}`);
  }

  const isAuthor = project.author_id === session.user.id || userIsDeveloper;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="new" icon={Rocket} title="프로젝트 수정" description="프로젝트의 최신 정보를 반영해요." />
      <main className="w-full flex-1 px-6 py-9">
        <ProjectForm initialData={project} isEdit={true} canDelete={isAuthor} />
      </main>
    </div>
  );
}
