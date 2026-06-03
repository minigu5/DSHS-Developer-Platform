"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton({ fallbackUrl = "/explore" }: { fallbackUrl?: string }) {
  const router = useRouter();

  return (
    <button 
      onClick={() => {
        if (window.history.length > 2) {
          router.back();
        } else {
          router.push(fallbackUrl);
        }
      }} 
      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium"
    >
      <ChevronLeft className="w-4 h-4 mr-1" /> 돌아가기
    </button>
  );
}
