import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Newspaper } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { TipEditor, type TipEditorDefaults } from "@/components/tips/tip-editor";

export const metadata = {
  title: "팁 수정 — DSHS Developer Platform",
};

export default async function EditTipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tips/${id}/edit`);

  const { data: tip, error } = await supabase
    .from("tips")
    .select("id, author_id, title, summary, content, cover_url, tags")
    .eq("id", id)
    .single();

  if (error || !tip) notFound();
  if (tip.author_id !== user.id) redirect(`/tips/${id}`);

  const defaults: TipEditorDefaults = {
    id: tip.id,
    title: tip.title,
    summary: tip.summary ?? "",
    content: tip.content,
    cover_url: tip.cover_url ?? "",
    tags: tip.tags ?? [],
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="tips" icon={Newspaper} title="팁 수정" variant="compact" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <TipEditor mode="edit" defaults={defaults} />
      </main>
    </div>
  );
}
