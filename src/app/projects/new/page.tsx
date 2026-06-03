import { SiteHeader } from "@/components/shared/site-header";
import { ProjectForm } from "@/components/projects/project-form";

export default function NewProjectPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <SiteHeader
        maxWidth="sm"
        back={{ type: "home" }}
        pageTitle="새 프로젝트 등록"
      />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">프로젝트 등록하기</h1>
          <p className="text-zinc-500 dark:text-zinc-400">당신이 만든 훌륭한 소프트웨어를 대곽 학우들과 공유하세요.</p>
        </div>

        <ProjectForm />
      </main>
    </div>
  );
}
