import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/constants";
import { Bell } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { AnnouncementEditor } from "@/components/announcements/announcement-editor";

export const metadata = {
  title: "공지사항 작성 — DSHS Developer Platform",
};

export default async function NewAnnouncementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/announcements/new");

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="announcements" icon={Bell} title="공지 작성" variant="compact" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <AnnouncementEditor mode="create" isAdmin={isDeveloper(user.email)} />
      </main>
    </div>
  );
}
