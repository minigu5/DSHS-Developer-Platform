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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50/50 font-sans dark:bg-[#09090b]">
      <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-orange-500/10 blur-[120px] dark:bg-orange-600/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[120px] dark:bg-amber-600/10" />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-16 sm:px-6">
        <HaejwoWizard />
      </main>
    </div>
  );
}
