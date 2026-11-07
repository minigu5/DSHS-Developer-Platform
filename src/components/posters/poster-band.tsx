"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { POSTER_BAND_CSS, posterBandHtml } from "@/lib/posters/band";
import type { PosterBandPosition, PosterTone } from "@/lib/posters/config";

// 포스터 칸 하나에 띠가 여러 장(띠 받기 + 포스터마다) 그려져서 QR 은 프로젝트마다 한 번만 만든다
const qrCache = new Map<string, Promise<string>>();
const qrDone = new Map<string, string>();

function projectQr(projectId: string): Promise<string> {
  let qr = qrCache.get(projectId);
  if (!qr) {
    qr = QRCode.toString(`https://dshs.dev/projects/${projectId}`, { type: "svg", margin: 0 }).then((svg) => {
      qrDone.set(projectId, svg);
      return svg;
    });
    qr.catch(() => qrCache.delete(projectId));
    qrCache.set(projectId, qr);
  }
  return qr;
}

/** 포스터 아래 플랫폼 띠 — 우리 코드가 그린다(AI HTML 밖). QR 은 보안과 무관한 표시 작업이라 브라우저에서 만든다. */
export function PosterBand({ title, projectId, tone, position }: { title: string; projectId: string; tone: PosterTone; position: PosterBandPosition }) {
  const [qrSvg, setQrSvg] = useState(() => qrDone.get(projectId) ?? "");
  useEffect(() => {
    let alive = true;
    projectQr(projectId)
      .then((svg) => alive && setQrSvg(svg))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [projectId]);

  return (
    <>
      {/* 띠 CSS 는 dshs-band* 클래스만 건드린다. 화면에선 사이트의 Plex KR(next/font)로 */}
      <style>{`${POSTER_BAND_CSS}\n.poster-preview .dshs-band { font-family: var(--font-plex-kr), system-ui, sans-serif; }`}</style>
      {/* 우리 문자열(프로젝트 이름은 posterBandHtml 이 이스케이프) */}
      <div dangerouslySetInnerHTML={{ __html: posterBandHtml({ title, tone, position, qrSvg }) }} />
    </>
  );
}
