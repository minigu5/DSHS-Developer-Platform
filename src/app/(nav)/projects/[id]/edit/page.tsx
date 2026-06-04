import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">프로젝트 수정하기</h1>
            <p className="text-zinc-500 dark:text-zinc-400">프로젝트의 최신 정보를 반영해주세요.</p>
          </div>

          <ProjectForm initialData={project} isEdit={true} />
        </div>
      </main>
    </div>
  );
}
