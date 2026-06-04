"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TipLikeButtonProps {
  tipId: string;
  initialCount: number;
}

export function TipLikeButton({ tipId, initialCount }: TipLikeButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("tip_likes")
        .select("tip_id")
        .eq("tip_id", tipId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (active) setLiked(Boolean(data));
    });
    return () => {
      active = false;
    };
  }, [tipId]);

  async function toggle() {
    if (!userId) {
      router.push(`/login?next=/tips/${tipId}`);
      return;
    }
    if (pending) return;
    setPending(true);

    // 낙관적 업데이트
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    const { error } = nextLiked
      ? await supabase.from("tip_likes").insert({ tip_id: tipId, user_id: userId })
      : await supabase.from("tip_likes").delete().eq("tip_id", tipId).eq("user_id", userId);

    setPending(false);
    if (error) {
      // 롤백
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
      toast.error("좋아요 처리에 실패했습니다.", { description: error.message });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
        liked
          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
          : "border-zinc-200 bg-white/70 text-zinc-600 hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-rose-900/50",
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-rose-500 text-rose-500")} />
      {count}
    </button>
  );
}
