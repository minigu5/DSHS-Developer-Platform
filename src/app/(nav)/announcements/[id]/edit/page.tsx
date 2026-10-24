import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/constants";
import { Bell } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="announcements" icon={Bell} title="공지 수정" variant="compact" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
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
      </main>
    </div>
  );
}
