import { Rocket } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { ProjectForm } from "@/components/projects/project-form";

export default function NewProjectPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero
        section="new"
        icon={Rocket}
        title="프로젝트 등록하기"
        description="직접 만든 프로그램을 올리면 다른 학생들이 써 보고 리뷰를 남길 수 있어요."
      />
      <main className="w-full flex-1 px-6 py-9">
        <ProjectForm />
      </main>
    </div>
  );
}
