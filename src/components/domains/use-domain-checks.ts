"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { verifySubdomain } from "@/lib/domains/actions";
import { startPoller } from "@/lib/domains/poller";
import type { DomainView } from "@/lib/domains/read";
import type { CheckResult } from "@/lib/domains/verify";

// 화면을 열어 두는 동안 알아서 확인한다: ② 원래 주소를 넣고 아직 확인 전인 주소(원래 주소에서),
// 호스트 연결까지 끝낸(설정 중·끊김) 주소(실제 주소에서). 배포·인증서 발급에 몇 분 걸려서,
// 학생이 확인하기를 눌러 가며 기다리지 않게 하려는 것.
export const AUTO_INTERVAL_MS = 20_000;
export const AUTO_MAX_ROUNDS = 30; // 20초 × 30 = 10분
const WAKE_MIN_GAP_MS = 5_000;

export type CheckState = {
  checking: boolean;
  result: CheckResult["kind"] | null;
  detail: string | null;
  error: string;
};

export const IDLE_CHECK: CheckState = { checking: false, result: null, detail: null, error: "" };

/** on: 이 화면이 자동으로 확인 중, stopped: 횟수를 다 써서 멈춤, off: 자동 확인 대상 아님 */
export type AutoState = "on" | "stopped" | "off";

export function useDomainChecks(domains: DomainView[]) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, CheckState>>({});
  const [stoppedKey, setStoppedKey] = useState("");
  const inFlight = useRef(new Set<string>());
  const known = useRef<Record<string, DomainView>>({});

  useEffect(() => {
    known.current = Object.fromEntries(domains.map((d) => [d.id, d]));
  }, [domains]);

  const pollKey = useMemo(
    () =>
      domains
        .filter((d) => d.status === "pending" || d.status === "broken" || (d.status === "reserved" && d.siteUrl !== null && !d.siteVerified))
        .map((d) => d.id)
        .sort()
        .join(","),
    [domains],
  );

  const check = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);
      setStates((s) => ({ ...s, [id]: { ...(s[id] ?? IDLE_CHECK), checking: true, error: "" } }));
      try {
        const r = await verifySubdomain(id);
        if (!r.ok) {
          setStates((s) => ({ ...s, [id]: { checking: false, result: null, detail: null, error: r.error } }));
          return;
        }
        setStates((s) => ({ ...s, [id]: { checking: false, result: r.data.result, detail: r.data.detail, error: "" } }));
        const before = known.current[id];
        if (before && !before.siteVerified && r.data.siteVerified) {
          toast.success("내 사이트가 확인됐어요. 이제 호스트에 연결해요");
          router.refresh();
        } else if (before && before.status !== r.data.status) {
          if (r.data.status === "active") toast.success(`${before.name}.dshs.dev 연결이 확인됐어요`);
          router.refresh();
        }
      } catch {
        setStates((s) => ({
          ...s,
          [id]: { checking: false, result: null, detail: null, error: "확인하지 못했어요. 잠시 뒤 다시 시도해 주세요." },
        }));
      } finally {
        inFlight.current.delete(id);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!pollKey) return;
    const ids = pollKey.split(",");
    const poller = startPoller({
      intervalMs: AUTO_INTERVAL_MS,
      maxRounds: AUTO_MAX_ROUNDS,
      minGapMs: WAKE_MIN_GAP_MS,
      isVisible: () => document.visibilityState === "visible",
      round: async () => {
        await Promise.all(ids.map(check));
      },
      onStop: () => setStoppedKey(pollKey),
    });
    // 호스트 설정 화면에 갔다가 돌아온 순간이 가장 가능성이 높다
    const wake = () => {
      if (document.visibilityState === "visible") poller.wake();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      poller.stop();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [pollKey, check]);

  const autoOf = (id: string): AutoState => {
    if (!pollKey.split(",").includes(id)) return "off";
    return stoppedKey === pollKey ? "stopped" : "on";
  };

  return { stateOf: (id: string): CheckState => states[id] ?? IDLE_CHECK, autoOf, check };
}
