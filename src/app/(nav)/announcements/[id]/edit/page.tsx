import { notFound, redirect } from "next/navigation";

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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            공지사항 수정
          </h1>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
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
