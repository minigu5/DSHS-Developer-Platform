"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, LayoutTemplate, Monitor, Sparkles, Type, Undo2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { SelectCard } from "@/components/forms/select-card";
import { ImageUploadInput } from "@/components/shared/image-upload-input";
import { Button } from "@/components/ui/button";
import { setPosterBand, undoPoster } from "@/lib/posters/actions";
import { POSTER_AI_JOB, POSTER_MAC, type PosterBandPosition, type PosterTone } from "@/lib/posters/config";
import { parseHeartbeatBody } from "@/lib/posters/heartbeat";
import { MAX_REQUEST, POSTER_COPY } from "@/lib/posters/messages";
import type { PosterView } from "@/lib/posters/store";
import { POSTER_STYLES, POSTER_STYLE_TEXT, type PosterStyle } from "@/lib/posters/style";
import { SECTION_COLORS } from "@/lib/section-colors";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
import { cn } from "@/lib/utils";

import { PosterPreview } from "./poster-preview";
import { Segment } from "./segment";

type Busy = null | "ask" | "redraw" | "undo" | "png" | "pdf";
// 큐에 넣었으면 { queued, jobId } — 결과는 /job 으로 확인. 큐를 못 쓰면 예전처럼 끝까지 기다려 { poster }
type AskResult = { ok: true; queued: true; jobId: string } | { ok: true; queued?: undefined; poster: PosterView; notice?: string } | { ok: false; error: string };
type JobStatus =
  | { ok: true; status: "pending"; poster: PosterView }
  | { ok: true; status: "done"; notice?: string; poster: PosterView }
  | { ok: true; status: "failed"; error: string; poster: PosterView }
  | { ok: false; error: string };
type ArtStatus = { ok: true; status: "none" | "pending" | "done" | "expired" | "failed"; poster: PosterView } | { ok: false; error: string };

const SMALL_BUTTON = "h-9 rounded-full px-3 text-sm";
const STYLE_ICONS: Record<PosterStyle, LucideIcon> = { auto: Sparkles, example: LayoutTemplate, art: ImageIcon, screenshot: Monitor, type: Type };

/** 만들기·고치기 화면: 왼쪽(좁으면 위) 미리보기, 오른쪽(좁으면 아래) 대화. 수정 화면 옆 칸 안에 있어서 화면 폭이 아니라 칸 폭(@container)으로 나눈다. */
export function PosterStudio({
  initial,
  projectTitle,
  artGaveUp = false,
}: {
  initial: PosterView;
  projectTitle: string;
  // 탭을 닫은 사이 학교 Mac 그림이 막혀 서버 페이지가 정리했으면 true — 열자마자 한 번 클라우드로
  artGaveUp?: boolean;
}) {
  const [poster, setPoster] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [elapsed, setElapsed] = useState(0);
  // 처음 만들 때만: 스타일과 화면 캡처(가로÷세로 비율은 브라우저가 그림을 열어 잰다)
  const [style, setStyle] = useState<PosterStyle>("auto");
  const [shotUrl, setShotUrl] = useState("");
  const [shotRatio, setShotRatio] = useState<number | null>(null);
  const latestShot = useRef("");
  // 큐를 못 써서 직접 기다리는 동안만(Workers 는 탭을 닫으면 남은 일을 30초까지만 이어 간다) 나가려 하면 묻는다.
  // 큐에 넣은 뒤(poster.aiJobId)엔 창을 닫아도 서버가 끝까지 만든다
  useUnsavedWarning(busy === "ask" || busy === "redraw", POSTER_COPY.leaveWhileBusy);
  const retried = useRef(false);

  useEffect(() => {
    if (!artGaveUp || retried.current || initial.aiJobId) return;
    retried.current = true;
    void callAi("redraw", { via: "cloud" });
    // 처음 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const log = useRef<HTMLOListElement>(null);
  // 버튼을 막을 때: 이 화면의 요청 중이거나 큐 일감이 돌고 있음
  const working = !!busy || !!poster.aiJobId;
  const workingRef = useRef(false);
  workingRef.current = working;
  const firstMake = !poster.html;
  const timerOn = (!!busy && busy !== "undo") || !!poster.aiJobId;

  // PNG·PDF 용 AI 확대 그림은 처음 부를 때 Cloudinary 가 ~10초 걸려 만든다 — 그림이 바뀌면 미리 한 번 불러 둔다(응답은 안 읽음)
  useEffect(() => {
    if (!poster.artPrintUrl) return;
    void fetch(poster.artPrintUrl, { method: "HEAD", mode: "no-cors" }).catch(() => {});
  }, [poster.artPrintUrl]);

  useEffect(() => {
    if (!timerOn) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [timerOn]);

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
          if (workingRef.current) toast(POSTER_COPY.artGaveUp);
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

  // 큐 일감(만들기·고치기·다시 그리기)이 끝날 때까지 3초마다 확인 — 창을 닫았다 다시 열어도 서버 페이지가 준 aiJobId 로 이어서
  useEffect(() => {
    const jobId = poster.aiJobId;
    if (!jobId) return;
    let stopped = false;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > POSTER_AI_JOB.pollStopMs) {
        clearInterval(timer);
        toast(POSTER_COPY.aiSlow);
        return;
      }
      try {
        const res = await fetch(`/api/posters/${poster.id}/job?id=${jobId}`, { cache: "no-store" });
        const result = (await res.json()) as JobStatus;
        if (stopped || !result.ok || result.status === "pending") return;
        clearInterval(timer);
        stopped = true;
        setPoster(result.poster);
        if (result.status === "failed") toast.error(result.error);
        else if (result.notice) toast(result.notice);
      } catch {
        // 잠깐 끊겨도 다음 확인에서 다시 묻는다
      }
    }, POSTER_AI_JOB.pollMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [poster.aiJobId, poster.id]);

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
      if (result.queued) {
        setPoster((p) => ({ ...p, aiJobId: result.jobId, canRedraw: false }));
        return true;
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

  function changeShot(url: string) {
    setShotUrl(url);
    setShotRatio(null);
    latestShot.current = url;
    if (!url) return;
    const img = new Image();
    // 늦게 온 옛 그림이 새 비율을 덮지 않게 같은 주소일 때만
    img.onload = () => {
      if (latestShot.current === url && img.naturalHeight) setShotRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = url;
  }

  async function send() {
    if (working) return;
    const body = !poster.html ? { message, style, screenshot: style === "screenshot" ? { url: shotUrl, ratio: shotRatio } : undefined } : { message };
    if (await callAi("ask", body)) setMessage("");
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
    setElapsed(0);
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

  const aiBusy = busy === "ask" || busy === "redraw" || !!poster.aiJobId;

  return (
    <div className="@container">
    <div className="grid gap-8 @4xl:grid-cols-[minmax(0,1fr)_400px] @4xl:items-start">
      <div className="@4xl:sticky @4xl:top-0">
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
              <Button key={format} variant="outline" className={SMALL_BUTTON} disabled={!poster.html || poster.artPending || working} onClick={() => download(format)}>
                <Download className="mr-1 h-4 w-4" aria-hidden />
                {busy === format ? `만드는 중… ${elapsed}초` : `${format.toUpperCase()}로 받기`}
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
          <Button variant="ghost" className={SMALL_BUTTON} disabled={!poster.canUndo || working} onClick={undo}>
            <Undo2 className="mr-1 h-4 w-4" aria-hidden /> 되돌리기
          </Button>
          <Button variant="ghost" className={SMALL_BUTTON} disabled={!poster.canRedraw || working} onClick={() => callAi("redraw")}>
            <ImageIcon className="mr-1 h-4 w-4" aria-hidden /> 그림 다시 그리기
          </Button>
        </div>

        {firstMake && (
          <fieldset className="mt-4" disabled={aiBusy}>
            <legend className="text-sm font-semibold text-zinc-900 dark:text-white">스타일</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {POSTER_STYLES.map((key) => (
                <SelectCard
                  key={key}
                  selected={style === key}
                  onSelect={() => setStyle(key)}
                  icon={STYLE_ICONS[key]}
                  label={POSTER_STYLE_TEXT[key].label}
                  description={POSTER_STYLE_TEXT[key].hint}
                  className={key === "auto" ? "col-span-2" : undefined}
                />
              ))}
            </div>
            {style === "screenshot" && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-zinc-500">프로그램 화면을 캡처해서 올려 주세요. 가로 화면은 노트북, 세로 화면은 폰 틀에 넣어요.</p>
                <ImageUploadInput value={shotUrl} onChange={changeShot} placeholder="화면 캡처를 끌어다 놓거나 눌러서 올리기" />
              </div>
            )}
          </fieldset>
        )}

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
            {aiBusy ? `${elapsed}초 지남 · ${poster.aiJobId ? POSTER_COPY.aiWorking : "1~2분 걸려요"}` : `${message.length} / ${MAX_REQUEST}`}
          </span>
          <Button
            className={cn("h-11 rounded-full px-5", SECTION_COLORS.new.button)}
            disabled={working || (!firstMake && !message.trim()) || (firstMake && style === "screenshot" && !shotRatio)}
            onClick={send}
          >
            {aiBusy ? "만드는 중…" : firstMake ? "포스터 만들기" : "부탁 보내기"}
          </Button>
        </div>
      </section>
    </div>
    </div>
  );
}
