"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setPosterBand, undoPoster } from "@/lib/posters/actions";
import { POSTER_MAC, type PosterBandPosition, type PosterTone } from "@/lib/posters/config";
import { parseHeartbeatBody } from "@/lib/posters/heartbeat";
import { MAX_REQUEST, POSTER_COPY } from "@/lib/posters/messages";
import type { PosterView } from "@/lib/posters/store";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

import { PosterPreview } from "./poster-preview";
import { Segment } from "./segment";

type Busy = null | "ask" | "redraw" | "undo" | "png" | "pdf";
type AskResult = { ok: true; poster: PosterView; notice?: string } | { ok: false; error: string };
type ArtStatus = { ok: true; status: "none" | "pending" | "done" | "expired" | "failed"; poster: PosterView } | { ok: false; error: string };

const SMALL_BUTTON = "h-9 rounded-full px-3 text-sm";

/** 만들기·고치기 화면: 왼쪽(모바일 위) 미리보기, 오른쪽(모바일 아래) 대화. */
export function PosterStudio({ initial, projectTitle }: { initial: PosterView; projectTitle: string }) {
  const [poster, setPoster] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [elapsed, setElapsed] = useState(0);
  const log = useRef<HTMLOListElement>(null);
  const busyRef = useRef<Busy>(null);
  busyRef.current = busy;
  const firstMake = !poster.html;

  useEffect(() => {
    if (busy !== "ask" && busy !== "redraw") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    log.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [poster.messages.length]);

  // 학교 Mac 이 그리는 동안 3초마다 확인. 막혔다고 오면(expired·failed) 한 번만 클라우드로 다시 그린다.
  useEffect(() => {
    if (!poster.artPending) return;
    let stopped = false;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > POSTER_MAC.pollStopMs) {
        clearInterval(timer);
        toast(POSTER_COPY.artSlow);
        return;
      }
      try {
        const res = await fetch(`/api/posters/${poster.id}/art`, { cache: "no-store" });
        const result = (await res.json()) as ArtStatus;
        if (stopped || !result.ok || result.status === "pending") return;
        clearInterval(timer);
        setPoster(result.poster);
        if (result.status === "expired" || result.status === "failed") {
          if (busyRef.current) toast(POSTER_COPY.artGaveUp);
          else void callAi("redraw", { via: "cloud" });
        }
      } catch {
        // 잠깐 끊겨도 다음 확인에서 다시 묻는다
      }
    }, POSTER_MAC.pollMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // callAi 는 매 렌더 새로 만들어지지만 poster.id 가 같으면 같은 일을 한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poster.artPending, poster.id]);

  async function callAi(path: "ask" | "redraw", body?: object) {
    setElapsed(0);
    setBusy(path);
    try {
      const res = await fetch(`/api/posters/${poster.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const result = parseHeartbeatBody(await res.text()) as AskResult;
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      setPoster(result.poster);
      if (result.notice) toast(result.notice);
      return true;
    } catch {
      toast.error("연결이 끊겼어요. 새로 고침해서 결과를 확인해 주세요.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (busy) return;
    if (await callAi("ask", { message })) setMessage("");
  }

  async function undo() {
    setBusy("undo");
    const result = await undoPoster(poster.id);
    setBusy(null);
    if (result.error || !result.poster) toast.error(result.error ?? "되돌리지 못했어요.");
    else setPoster(result.poster);
  }

  async function changeBand(band: { tone: PosterTone; position: PosterBandPosition }) {
    const before = { tone: poster.tone, position: poster.position };
    setPoster((p) => ({ ...p, ...band }));
    const result = await setPosterBand(poster.id, band);
    if (result.error) {
      setPoster((p) => ({ ...p, ...before }));
      toast.error(result.error);
    }
  }

  async function download(format: "png" | "pdf") {
    setBusy(format);
    try {
      const res = await fetch(`/api/posters/${poster.id}/export?format=${format}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "파일을 만들지 못했어요. 잠시 뒤 다시 해 주세요.");
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle} 포스터.${format}`;
      a.click();
      // Safari 는 바로 해제하면 받기가 취소된다
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(null);
    }
  }

  const aiBusy = busy === "ask" || busy === "redraw";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="lg:sticky lg:top-20">
        <PosterPreview
          html={poster.html}
          artUrl={poster.artUrl}
          title={projectTitle}
          projectId={poster.projectId}
          tone={poster.tone}
          position={poster.position}
          pending={poster.artPending}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap gap-2">
            <Segment
              label="띠 색"
              value={poster.tone}
              options={[["light", "밝은 띠"], ["dark", "어두운 띠"]]}
              onChange={(tone) => changeBand({ tone, position: poster.position })}
            />
            <Segment
              label="띠 위치"
              value={poster.position}
              options={[["bottom", "아래"], ["top", "위"]]}
              onChange={(position) => changeBand({ tone: poster.tone, position })}
            />
          </div>
          <div className="flex gap-2">
            {(["png", "pdf"] as const).map((format) => (
              <Button key={format} variant="outline" className={SMALL_BUTTON} disabled={!poster.html || poster.artPending || !!busy} onClick={() => download(format)}>
                <Download className="mr-1 h-4 w-4" aria-hidden />
                {busy === format ? "만드는 중…" : `${format.toUpperCase()}로 받기`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <section aria-label="AI에게 부탁하기" className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <ol ref={log} className="flex max-h-[420px] min-h-[120px] flex-col gap-2 overflow-y-auto" aria-live="polite">
          {poster.messages.length === 0 && (
            <li className="text-sm text-zinc-500">
              강조하고 싶은 점을 적어 보내거나, 비워 두고 바로 보내도 돼요. AI가 그림과 제목을 정해 포스터를 만들어요.
            </li>
          )}
          {poster.messages.map((m, i) => (
            <li
              key={`${m.at}-${i}`}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "self-start bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              {m.text}
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="ghost" className={SMALL_BUTTON} disabled={!poster.canUndo || !!busy} onClick={undo}>
            <Undo2 className="mr-1 h-4 w-4" aria-hidden /> 되돌리기
          </Button>
          <Button variant="ghost" className={SMALL_BUTTON} disabled={!poster.canRedraw || !!busy} onClick={() => callAi("redraw")}>
            <ImageIcon className="mr-1 h-4 w-4" aria-hidden /> 그림 다시 그리기
          </Button>
        </div>

        <label htmlFor="poster-request" className="sr-only">
          AI에게 부탁할 내용
        </label>
        <textarea
          id="poster-request"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_REQUEST))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          rows={3}
          disabled={aiBusy}
          placeholder={firstMake ? "강조하고 싶은 점(비워도 돼요)" : "예: 제목을 더 크게, 바탕을 하늘색으로"}
          className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 tabular-nums">
            {aiBusy ? `${elapsed}초 지남 · 1~2분 걸려요` : `${message.length} / ${MAX_REQUEST}`}
          </span>
          <Button
            className={cn("h-11 rounded-full px-5", SECTION_COLORS.new.button)}
            disabled={!!busy || (!firstMake && !message.trim())}
            onClick={send}
          >
            {aiBusy ? "만드는 중…" : firstMake ? "포스터 만들기" : "부탁 보내기"}
          </Button>
        </div>
      </section>
    </div>
  );
}
