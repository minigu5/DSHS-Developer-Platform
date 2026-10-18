import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { HaejwoWizard } from "@/components/haejwo/haejwo-wizard";

export const metadata = {
  title: "아이디어 등록 — DSHS Developer Platform",
};

export default async function HaejwoNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/haejwo/new");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-16 sm:px-6">
        <HaejwoWizard />
      </main>
    </div>
  );
}
