"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { setHeart } from "@/lib/hearts-client";
import { cn } from "@/lib/utils";

interface HeartButtonProps {
  projectId: string;
  /** null 이면 누를 때 로그인으로 보낸다 */
  viewerId: string | null;
  count: number;
  hearted: boolean;
  /** 있으면 제어 모드 — 부모가 상태·저장을 맡는다(탐색: 즐겨찾기 칸과 목록이 같이 바뀌게) */
  onToggle?: (next: boolean) => void;
  size?: "card" | "detail";
  className?: string;
}

export function HeartButton({ projectId, viewerId, count, hearted, onToggle, size = "card", className }: HeartButtonProps) {
  const router = useRouter();
  const [local, setLocal] = useState({ count, hearted });
  const [pending, setPending] = useState(false);

  const shown = onToggle ? { count, hearted } : local;

  async function toggle() {
    if (!viewerId) {
      // useSearchParams 는 정적 페이지에서 Suspense 를 요구해서 누를 때 주소를 읽는다
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const next = !shown.hearted;
    if (onToggle) {
      onToggle(next);
      return;
    }
    if (pending) return;
    setPending(true);
    setLocal((s) => ({ hearted: next, count: s.count + (next ? 1 : -1) }));
    const { error } = await setHeart(createClient(), projectId, viewerId, next);
    setPending(false);
    if (error) {
      setLocal((s) => ({ hearted: !next, count: s.count + (next ? -1 : 1) }));
      toast.error("하트를 누르지 못했어요.", { description: error });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={shown.hearted}
      aria-label={`하트 ${shown.count}개${shown.hearted ? ", 누름" : ""}`}
      className={cn(
        "inline-flex items-center rounded-full border font-semibold transition-colors",
        size === "card" ? "h-7 gap-1 px-2.5 text-xs" : "h-9 gap-1.5 px-4 text-sm",
        shown.hearted
          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-900/50",
        className,
      )}
    >
      <Heart className={cn(size === "card" ? "h-3.5 w-3.5" : "h-4 w-4", shown.hearted && "fill-rose-500 text-rose-500")} aria-hidden />
      <span className="tabular-nums">{shown.count}</span>
    </button>
  );
}
