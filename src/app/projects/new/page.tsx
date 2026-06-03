"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { ProjectForm } from "@/components/projects/project-form";

export default function NewProjectPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium">
            <ChevronLeft className="w-4 h-4 mr-1" /> 홈으로
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-zinc-500 hidden sm:block">
              새 프로젝트 등록
            </div>
            <AuthButtons />
          </div>
        </div>
      </header>

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
