"use client";

import { cn } from "@/lib/utils";

/** 둘 중 하나 고르기(띠 색·위치) — 알약 세그먼트, aria-pressed */
export function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900" role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => value !== key && onChange(key)}
          className={cn(
            "h-7 rounded-full px-3 text-sm transition-colors",
            value === key ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-600 dark:text-zinc-400",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
