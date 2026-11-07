"use client";

// 등록·수정 폼의 "포스터 그림 올리기" 칸 — 고른 파일을 바로 올리지 않고 미리보기만 한다.
// 프로젝트 저장이 끝난 뒤 폼이 /api/posters/upload 로 올린다(등록을 그만둬도 Cloudinary 에 버려진 파일이 안 남게).

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { POSTER_FILE_ACCEPT, POSTER_FILE_MAX_BYTES } from "./poster-upload-button";
import { cn } from "@/lib/utils";

import { useFileDrop } from "./use-file-drop";

const TYPES = POSTER_FILE_ACCEPT.split(",");

export function PosterFileField({
  file,
  onChange,
  disabledReason,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  /** 있으면 칸을 끄고 이 안내를 보인다(비공개 프로젝트 등) */
  disabledReason: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (next: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!next) return;
    if (!TYPES.includes(next.type)) {
      setError("PNG, JPG, WebP 그림만 올릴 수 있어요.");
      return;
    }
    if (next.size > POSTER_FILE_MAX_BYTES) {
      setError("포스터 그림은 10MB까지 올릴 수 있어요.");
      return;
    }
    setError("");
    onChange(next);
  };
  const drop = useFileDrop(pick);

  if (disabledReason) {
    return <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">{disabledReason}</p>;
  }

  return (
    <div
      {...drop.handlers}
      className={cn("-m-2 flex flex-col gap-2 rounded-2xl border-2 border-dashed p-2 transition-colors", drop.dragging ? "border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/60" : "border-transparent")}
    >
      <input ref={input} type="file" accept={POSTER_FILE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
      {file && preview ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- 고른 파일 미리보기(blob:) */}
          <img src={preview} alt="고른 포스터 미리보기" className="h-36 w-auto max-w-[45%] rounded-xl object-contain ring-1 ring-zinc-200 dark:ring-zinc-800" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">{file.name}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => input.current?.click()} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-full px-4")}>
                다른 그림 고르기
              </button>
              <button type="button" onClick={() => onChange(null)} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 rounded-full px-3 text-zinc-600 dark:text-zinc-400")}>
                <X className="mr-1 h-4 w-4" aria-hidden /> 빼기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 w-fit rounded-full px-4")}
        >
          <ImageUp className="mr-1.5 h-4 w-4" aria-hidden /> 포스터 그림 고르기
        </button>
      )}
      <p className="text-xs text-zinc-500">{drop.dragging ? "놓으면 이 그림으로 골라요" : "그림 파일을 여기로 끌어다 놓아도 돼요."}</p>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
