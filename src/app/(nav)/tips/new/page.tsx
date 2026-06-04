import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { TipEditor } from "@/components/tips/tip-editor";

export const metadata = {
  title: "팁 작성 — DSHS Developer Platform",
};

export default async function NewTipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tips/new");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/10" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          새 팁 작성
        </h1>
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">
          마크다운으로 자유롭게 작성하고, 미리보기로 확인해보세요.
        </p>
        <TipEditor mode="create" />
      </main>
    </div>
  );
}
