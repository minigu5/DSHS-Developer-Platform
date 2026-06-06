"use client";

import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  shape?: "square" | "circle";
  previewSize?: "sm" | "md";
  placeholder?: string;
  className?: string;
}

export function ImageUploadInput({
  value,
  onChange,
  shape = "square",
  previewSize = "md",
  placeholder = "파일을 드래그하거나 클릭해서 업로드",
  className,
}: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState(value);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "업로드에 실패했습니다.");
        return;
      }
      onChange(json.url);
      setUrlInput(json.url);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    upload(file);
  }, [upload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUrlCommit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
  }, [urlInput, value, onChange]);

  const handleClear = useCallback(() => {
    onChange("");
    setUrlInput("");
    setError(null);
  }, [onChange]);

  const previewDim = previewSize === "sm" ? "w-12 h-12" : "w-16 h-16";
  const roundedPreview = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        {/* 미리보기 */}
        <div className={cn(
          "shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center",
          previewDim,
          roundedPreview,
        )}>
          {value ? (
            <Image
              src={value}
              alt="미리보기"
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-zinc-400" />
          )}
        </div>

        {/* 드롭존 + URL 입력 */}
        <div className="flex-1 space-y-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            className={cn(
              "relative flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
              "text-xs font-medium",
              dragOver
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-600",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 업로드 중...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> {placeholder}</>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* URL 직접 입력 */}
          <div className="relative flex items-center">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlCommit}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlCommit(); } }}
              placeholder="또는 이미지 URL 직접 입력"
              className="flex h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            />
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="이미지 제거"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}
