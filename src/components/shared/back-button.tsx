"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton({ 
  fallbackUrl = "/explore", 
  label = "돌아가기",
  variant = "button"
}: { 
  fallbackUrl?: string; 
  label?: string;
  variant?: "button" | "link";
}) {
  const router = useRouter();

  const handleClick = () => {
    // history.length가 1보다 크면 뒤로가기 가능 (첫 진입이 아님)
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  if (variant === "link") {
    return (
      <button 
        onClick={handleClick}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> {label}
      </button>
    );
  }

  return (
    <button 
      onClick={handleClick} 
      className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-white/90 dark:hover:bg-zinc-800/80 transition-all shadow-sm mb-6"
    >
      <ChevronLeft className="w-4 h-4 mr-1" /> {label}
    </button>
  );
}
