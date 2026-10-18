"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, isExternalImage } from "@/lib/utils";

interface ProjectIconProps {
  src: string | null;
  title: string;
  className?: string;
  /** 옆에 프로젝트 이름이 함께 보이면 true — 스크린리더가 이름을 두 번 읽지 않게 함 */
  decorative?: boolean;
}

// 아이콘이 없는 프로젝트용 이니셜 타일 색. 제목으로 고정 선택해 새로고침해도 같은 색 유지
const FALLBACK_TINTS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
] as const;

function tintFor(title: string): string {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return FALLBACK_TINTS[Math.abs(hash) % FALLBACK_TINTS.length];
}

export function ProjectIcon({ src, title, className, decorative = false }: ProjectIconProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : title}
        aria-hidden={decorative || undefined}
        className={cn(
          "flex items-center justify-center rounded-2xl font-heading font-bold select-none [container-type:inline-size]",
          tintFor(title),
          className,
        )}
      >
        <span className="text-[45cqi] leading-none">{title.trim().charAt(0).toUpperCase() || "?"}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10", className)}>
      <Image
        src={src}
        alt={decorative ? "" : title}
        fill
        sizes="96px"
        className="object-cover"
        onError={() => setError(true)}
        unoptimized={isExternalImage(src)}
      />
    </div>
  );
}
