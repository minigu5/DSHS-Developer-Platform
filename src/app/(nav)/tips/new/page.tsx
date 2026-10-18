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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          새 팁 작성
        </h1>
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">
          마크다운으로 작성하고 미리보기 탭에서 확인할 수 있어요.
        </p>
        <TipEditor mode="create" />
      </main>
    </div>
  );
}
