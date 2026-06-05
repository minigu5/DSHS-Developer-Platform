import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-orange-500/10 blur-[120px] dark:bg-orange-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px] dark:bg-amber-600/10" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6 py-12 flex flex-col items-center">
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
