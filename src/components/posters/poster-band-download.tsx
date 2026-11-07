"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { PosterBandPosition, PosterTone } from "@/lib/posters/config";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

import { PosterBand } from "./poster-band";
import { Segment } from "./segment";

/** 포스터 띠만 받기 — 자기가 만든 포스터 위·아래에 붙이는 "대곽 개발자 플랫폼에서 만나요" 띠 + 이 프로젝트 QR. */
export function PosterBandDownload({ title, projectId }: { title: string; projectId: string }) {
  const [tone, setTone] = useState<PosterTone>("light");
  // 위·아래는 띠 테두리 선 위치만 바뀌어서(2px) 고르지 않는다(2026-11-07 사용자 "의미가 없다") — 아래에 붙이는 모양 하나
  const position: PosterBandPosition = "bottom";
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      // 캔버스·QR 라이브러리는 누를 때만 받는다
      const { drawBandPng } = await import("@/lib/posters/band-canvas");
      const blob = await drawBandPng({ title, projectId, tone, position });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title} 띠${tone === "dark" ? " 어두운" : ""}.png`;
      a.click();
      // Safari 는 바로 해제하면 받기가 취소된다
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("띠를 만들지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="band-title" className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 id="band-title" className="font-heading text-xl font-semibold text-zinc-900 dark:text-white">
        포스터 띠 받기
      </h2>
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        직접 만든 포스터 위나 아래에 붙이세요. QR을 찍으면 이 프로젝트 페이지로 와요.
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <div className="poster-preview relative w-full" style={{ aspectRatio: "1240 / 236" }}>
          <BandScaled title={title} projectId={projectId} tone={tone} position={position} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Segment label="띠 색" value={tone} options={[["light", "밝은 띠"], ["dark", "어두운 띠"]]} onChange={setTone} />
        <Button className={cn("h-11 rounded-full px-5", SECTION_COLORS.new.button)} disabled={busy} onClick={download}>
          <Download className="mr-1 h-4 w-4" aria-hidden /> {busy ? "만드는 중…" : "PNG로 받기"}
        </Button>
      </div>
    </section>
  );
}

// 1240px 띠를 카드 폭에 맞춰 줄여 보여 준다
function BandScaled(props: { title: string; projectId: string; tone: PosterTone; position: PosterBandPosition }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1240);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="absolute inset-0">
      {scale > 0 && (
        <div className="origin-top-left" style={{ width: 1240, transform: `scale(${scale})` }}>
          <PosterBand {...props} />
        </div>
      )}
    </div>
  );
}
