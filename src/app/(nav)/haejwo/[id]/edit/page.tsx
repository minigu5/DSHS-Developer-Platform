import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Megaphone } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { HaejwoWizard } from "@/components/haejwo/haejwo-wizard";

export const metadata = {
  title: "아이디어 수정 — DSHS Developer Platform",
};

export default async function EditHaejwoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/haejwo/${id}/edit`);

  const { data: idea, error } = await supabase
    .from("ideas")
    .select("id, author_id, title, type, category, content")
    .eq("id", id)
    .single();

  if (error || !idea) notFound();
  if (idea.author_id !== user.id) redirect(`/haejwo/${id}`);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="haejwo" icon={Megaphone} title="해줘! 수정" variant="compact" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-7">
        <HaejwoWizard
          mode="edit"
          defaults={{
            id: idea.id,
            type: idea.type,
            category: idea.category,
            title: idea.title,
            content: idea.content,
          }}
        />
      </main>
    </div>
  );
}
