import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthButtons } from "@/components/shared/auth-buttons";
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
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={`/projects/${id}`} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium">
            <ChevronLeft className="w-4 h-4 mr-1" /> 프로젝트로 돌아가기
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-zinc-500 hidden sm:block">
              프로젝트 수정
            </div>
            <AuthButtons />
          </div>
        </div>
      </header>

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
