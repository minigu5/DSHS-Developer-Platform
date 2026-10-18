import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/constants";
import { AnnouncementEditor } from "@/components/announcements/announcement-editor";

export const metadata = {
  title: "공지사항 작성 — DSHS Developer Platform",
};

export default async function NewAnnouncementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/announcements/new");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            공지사항 작성
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            카테고리를 고르고 마크다운으로 작성해 주세요.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <AnnouncementEditor mode="create" isAdmin={isDeveloper(user.email)} />
        </div>
      </main>
    </div>
  );
}
