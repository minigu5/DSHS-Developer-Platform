"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 내 프로필 머리의 로그아웃 — 헤더 드롭다운의 로그아웃과 같은 동작 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 rounded-full px-3.5 text-[13px] text-zinc-600 dark:text-zinc-400")}
    >
      <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
      로그아웃
    </button>
  );
}
