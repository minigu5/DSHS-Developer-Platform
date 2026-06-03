"use client";

import { useState } from "react";
import Image from "next/image";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

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
        unoptimized={src.startsWith('https://www.google.com/s2/favicons')} // Favicon service often needs unoptimized
      />
    </div>
  );
}
