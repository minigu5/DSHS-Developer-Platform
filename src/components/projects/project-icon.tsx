"use client";

import { useState } from "react";
import Image from "next/image";
import { Terminal } from "lucide-react";
import { cn, isExternalImage } from "@/lib/utils";

interface ProjectIconProps {
  src: string | null;
  title: string;
  className?: string;
}

export function ProjectIcon({ src, title, className }: ProjectIconProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl", className)}>
        <Terminal className="w-1/2 h-1/2 text-zinc-400 dark:text-zinc-600" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-sm", className)}>
      <Image
        src={src}
        alt={title}
        fill
        className="object-cover"
        onError={() => setError(true)}
        unoptimized={isExternalImage(src)}
      />
    </div>
  );
}
