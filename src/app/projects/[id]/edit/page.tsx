import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/shared/site-header";
import { ProjectForm } from "@/components/projects/project-form";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch project
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Check ownership
  if (project.author_id !== session.user.id) {
    redirect(`/projects/${id}`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <SiteHeader
        maxWidth="sm"
        back={{ type: "custom", href: `/projects/${id}`, label: "프로젝트로 돌아가기" }}
        pageTitle="프로젝트 수정"
      />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">프로젝트 수정하기</h1>
          <p className="text-zinc-500 dark:text-zinc-400">프로젝트의 최신 정보를 반영해주세요.</p>
        </div>

        <ProjectForm initialData={project} isEdit={true} />
      </main>
    </div>
  );
}
