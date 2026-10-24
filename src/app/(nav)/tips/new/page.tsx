import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Newspaper } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="tips" icon={Newspaper} title="새 팁 작성" variant="compact" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-7">
        <TipEditor mode="create" />
      </main>
    </div>
  );
}
