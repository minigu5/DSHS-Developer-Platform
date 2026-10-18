import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-8">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          팁 수정
        </h1>
        <TipEditor mode="edit" defaults={defaults} />
      </main>
    </div>
  );
}
