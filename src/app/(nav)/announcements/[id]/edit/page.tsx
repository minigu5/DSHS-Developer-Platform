import { notFound, redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/constants";
import { AnnouncementEditor } from "@/components/announcements/announcement-editor";

export const metadata = {
  title: "공지사항 수정 — DSHS Developer Platform",
};

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/announcements/${id}/edit`);

  const { data: announcement } = await supabase
    .from("announcements")
    .select("id, author_id, title, category, content")
    .eq("id", id)
    .single();

  if (!announcement) notFound();
  if (announcement.author_id !== user.id && !isDeveloper(user.email)) {
    redirect(`/announcements/${id}`);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-600/10" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
            <Bell className="h-4 w-4" /> 공지사항
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            공지사항 수정
          </h1>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white/80 p-6 sm:p-8 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <AnnouncementEditor
            mode="edit"
            defaults={{
              id: announcement.id,
              title: announcement.title,
              category: announcement.category,
              content: announcement.content,
            }}
            isAdmin={isDeveloper(user.email)}
          />
        </div>
      </main>
    </div>
  );
}
