"use client";

import { useEffect, useRef, useState } from "react";

import { POSTER_CANVAS, type PosterTone } from "@/lib/posters/config";
import { posterSrcdoc } from "@/lib/posters/document";
import { cn } from "@/lib/utils";

import { PosterBand } from "./poster-band";

const TOTAL = POSTER_CANVAS.height + POSTER_CANVAS.bandHeight;

/**
 * A4 포스터 미리보기. AI HTML 은 sandbox iframe(srcdoc, 스크립트·same-origin 없음) 안에만 두고 사이트 DOM 에 넣지 않는다.
 * 1240×1754 원본을 컨테이너 폭에 맞춰 축소한다.
 */
export function PosterPreview({
  html,
  artUrl,
  title,
  projectId,
  tone,
  className,
}: {
  html: string | null;
  artUrl: string | null;
  title: string;
  projectId: string;
  tone: PosterTone;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / POSTER_CANVAS.width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={cn("poster-preview relative w-full overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:ring-zinc-800", className)}
      style={{ aspectRatio: `${POSTER_CANVAS.width} / ${TOTAL}` }}
    >
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 flex flex-col"
          style={{ width: POSTER_CANVAS.width, height: TOTAL, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {html ? (
            <iframe
              sandbox=""
              srcDoc={posterSrcdoc(html, artUrl)}
              title="포스터 미리보기"
              width={POSTER_CANVAS.width}
              height={POSTER_CANVAS.height}
              className="block flex-none border-0"
              tabIndex={-1}
            />
          ) : (
            <div className="flex flex-none items-center justify-center bg-zinc-100 text-5xl font-semibold text-zinc-500" style={{ height: POSTER_CANVAS.height }}>
              부탁을 보내면 AI가 포스터를 만들어요
            </div>
          )}
          <PosterBand title={title} projectId={projectId} tone={tone} />
        </div>
      )}
    </div>
  );
}
