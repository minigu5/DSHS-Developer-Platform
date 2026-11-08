"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { parseIconFit } from "@/lib/icon-fit";
import { cn, isExternalImage } from "@/lib/utils";

interface ProjectIconProps {
  src: string | null;
  title: string;
  className?: string;
  /** 옆에 프로젝트 이름이 함께 보이면 true — 스크린리더가 이름을 두 번 읽지 않게 함 */
  decorative?: boolean;
  /** projects.icon_fit — 자기 바탕이 있는 아이콘의 바탕색·꽉 채울 영역(src/lib/icon-fit.ts) */
  fit?: unknown;
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

// 움직일 수 있는 이미지 형식. 아이콘이 계속 움직이면 목록에서 시선을 다 뺏어서 첫 장면만 보여 준다
const ANIMATED_EXT = /\.(gif|webp|apng)(\?|#|$)/i;
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!pg_)/;

/** 직접 올린(Cloudinary) 움직이는 이미지는 첫 장면만 받는다(pg_1 변환 — 받는 크기도 줄어듦) */
function stillCloudinaryUrl(src: string): string {
  return ANIMATED_EXT.test(src) ? src.replace(CLOUDINARY_UPLOAD, "$1pg_1/") : src;
}

/** 바깥 주소의 움직이는 이미지는 받은 뒤 첫 장면을 canvas에 그려 멈춘 그림으로 보여 준다 */
function FrozenImage({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.naturalWidth) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
  };

  // 하이드레이션 전에 이미 다 받은 이미지는 onLoad가 다시 안 불리므로 직접 그린다
  useEffect(() => {
    if (imgRef.current?.complete) draw();
  }, [src]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 화면에는 canvas만 보이고, 이 img는 첫 장면을 받아 오는 용도 */}
      <img ref={imgRef} src={src} alt="" className="hidden" onLoad={draw} onError={onError} />
      <canvas
        ref={canvasRef}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={!alt || undefined}
        className="absolute inset-0 size-full object-cover"
      />
    </>
  );
}

export function ProjectIcon({ src, title, className, decorative = false, fit }: ProjectIconProps) {
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

  const stillSrc = stillCloudinaryUrl(src);
  // Cloudinary가 아닌 주소의 움직이는 형식만 canvas로 멈춘다
  const frozen = stillSrc === src && ANIMATED_EXT.test(src);
  const iconFit = parseIconFit(fit, src);
  const box = iconFit?.box;

  const picture = frozen ? (
    <FrozenImage src={src} alt={decorative ? "" : title} onError={() => setError(true)} />
  ) : (
    <Image
      src={stillSrc}
      alt={decorative ? "" : title}
      fill
      sizes="96px"
      className="object-cover"
      onError={() => setError(true)}
      unoptimized={isExternalImage(stillSrc)}
    />
  );

  return (
    // 바탕은 다크 모드에서도 흰색 — 투명 배경에 검은 그림인 아이콘이 어두운 카드 위에서 안 보였다.
    // 자기 바탕이 있는 아이콘은 그 색을 깔아 투명한 모서리로 흰색이 안 비치게 한다
    <div
      className={cn("relative overflow-hidden rounded-2xl bg-white outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10", className)}
      style={iconFit?.bg ? { backgroundColor: iconFit.bg } : undefined}
    >
      {box ? (
        // 바깥 여백이 있는 타일 아이콘은 타일만 틀에 꽉 차게 키운다
        <div
          className="absolute"
          style={{
            left: `${(-box[0] / box[2]) * 100}%`,
            top: `${(-box[1] / box[2]) * 100}%`,
            width: `${100 / box[2]}%`,
            height: `${100 / box[2]}%`,
          }}
        >
          {picture}
        </div>
      ) : (
        picture
      )}
    </div>
  );
}
