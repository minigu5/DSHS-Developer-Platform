import { ProjectForm } from "@/components/projects/project-form";

export default function NewProjectPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">프로젝트 등록하기</h1>
            <p className="text-zinc-500 dark:text-zinc-400">직접 만든 프로그램을 올리면 다른 학생들이 써 보고 리뷰를 남길 수 있어요.</p>
          </div>

          <ProjectForm />
        </div>
      </main>
    </div>
  );
}
