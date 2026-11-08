"use client";

import { useEffect, useState } from "react";

import { listMyNaruServers } from "@/lib/domains/actions";
import { edgeNotice, type NaruEdge } from "@/lib/domains/naru-edge";

const POLL_MS = 15_000;
const POLL_LIMIT_MS = 10 * 60_000;

// 연결된 대곽나루 주소의 서울 입구 상태와 이유(허브 edge). 준비 중이면 15초마다 다시 읽고 10분 뒤 멈춘다.
// 허브가 이 기능을 끄고 있으면(edge 없음) 아무것도 그리지 않는다.
export function NaruEdgeStatus({ fqdn }: { fqdn: string }) {
  const [edge, setEdge] = useState<NaruEdge | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const load = () => {
      void listMyNaruServers().then((r) => {
        if (cancelled || !r.ok) return;
        const s = r.data.find((x) => x.domain !== null && (x.domain.includes(".") ? x.domain : `${x.domain}.dshs.dev`) === fqdn);
        const e = s?.edge ?? null;
        setEdge(e);
        if ((e === "queued" || e === "pending") && Date.now() - started < POLL_LIMIT_MS) timer = setTimeout(load, POLL_MS);
      });
    };
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fqdn]);

  const notice = edgeNotice(edge);
  if (!notice) return null;
  return (
    <div className="flex flex-col gap-0.5" role="status">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{notice.label}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{notice.detail}</p>
    </div>
  );
}
