import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Megaphone } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PageHero section="haejwo" icon={Megaphone} title="해줘! 등록" variant="compact" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-7">
        <HaejwoWizard />
      </main>
    </div>
  );
}
