"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { posterImageAt } from "@/lib/posters/hang-logic";
import { POSTER_LIMITS } from "@/lib/posters/config";
import { getPosterList, getPosterStudio, type PosterListResult, type PosterStudioResult } from "@/lib/posters/panel";

import { PosterBandDownload } from "./poster-band-download";
import { PosterHangButton } from "./poster-hang-button";
import { DeletePosterButton, NewPosterButton } from "./poster-list-actions";
import { PosterPreview } from "./poster-preview";
import { POSTER_LIST, POSTER_PARAM, backToPosterList, closePosterSheet, notePosterSheetPop, openPosterSheet } from "./poster-sheet-nav";
import { PosterStudio } from "./poster-studio";
import { PosterUploadButton } from "./poster-upload-button";

const UUID = /^[0-9a-f-]{36}$/i;
const LOAD_FAILED = "포스터를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.";

// 만들기 화면 데이터 미리 받기 — 목록 카드에 마우스를 올리거나 초점이 가면 받아 두고, 열 때 한 번 쓰고 버린다
// (다 받은 값은 value 에 있어 첫 그림부터 내용이 보인다 — 회색 자리가 번쩍이지 않게)
const studioPrefetch = new Map<string, { promise: Promise<PosterStudioResult>; value?: PosterStudioResult }>();

function prefetchStudio(projectId: string, posterId: string) {
  if (studioPrefetch.has(posterId)) return;
  const entry: { promise: Promise<PosterStudioResult>; value?: PosterStudioResult } = {
    promise: getPosterStudio(projectId, posterId).catch((): PosterStudioResult => ({ ok: false, error: LOAD_FAILED })),
  };
  void entry.promise.then((value) => {
    entry.value = value;
  });
  studioPrefetch.set(posterId, entry);
}

/**
 * 프로젝트 수정 화면 오른쪽에서 나오는 포스터 칸(2026-11-07 사용자 결정 — 수정에서만 들어가는 기능이 따로 된 페이지라 어색해서).
 * 목록(띠 받기·올리기·AI 만들기·걸기)과 만들기 화면을 `?poster=` 로 오간다. 휴대폰에선 화면을 다 채운다.
 * 포스터는 누르는 즉시 저장되고, 폼의 "저장하기"와는 따로다.
 */
export function PosterSheet({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const router = useRouter();
  const value = useSearchParams().get(POSTER_PARAM);
  // 닫히는 동안(밀려 나가는 0.2초)엔 주소에서 값이 빠져도 보던 화면을 그대로 둔다 — 목록이 번쩍 다시 불리지 않게
  const [shown, setShown] = useState(value);
  if (value && value !== shown) setShown(value);
  const studioId = shown && shown !== POSTER_LIST && UUID.test(shown) ? shown : null;

  // 목록은 수정 화면이 열릴 때 미리 받고, 칸을 열 때마다 뒤에서 새로 읽는다(받아 둔 것을 먼저 보여 줌)
  const [list, setList] = useState<PosterListResult | null>(null);
  const loadList = useCallback(() => {
    getPosterList(projectId)
      .then(setList)
      .catch(() => setList({ ok: false, error: LOAD_FAILED }));
  }, [projectId]);
  useEffect(loadList, [loadList]);
  const listOpen = value === POSTER_LIST;
  useEffect(() => {
    if (listOpen) loadList();
  }, [listOpen, loadList]);
  // 칸에서 뭔가 바꿨을 때만 닫으며 폼 카드(걸린 포스터)를 새로 읽는다
  const changed = useRef(false);
  const reloadList = useCallback(() => {
    changed.current = true;
    loadList();
  }, [loadList]);

  useEffect(() => {
    window.addEventListener("popstate", notePosterSheetPop);
    return () => window.removeEventListener("popstate", notePosterSheetPop);
  }, []);

  // 닫으면 폼의 「홍보 포스터」 카드(걸린 포스터 그림)를 새로 읽는다 — 폼에 쓰던 내용은 그대로 남는다.
  // 만들기 화면에서 고친 AI 포스터는 걸린 그림과 상관없어서(다시 걸기 전까지) 목록에서 바꾼 것만 센다
  useEffect(() => {
    if (value || !changed.current) return;
    changed.current = false;
    router.refresh();
  }, [value, router]);

  return (
    <DialogPrimitive.Root open={!!value} onOpenChange={(open) => !open && closePosterSheet()}>
      <DialogPrimitive.Portal>
        {/* 배경·칸은 같은 길이로, 닫힐 땐 끝난 모양을 유지(fill-mode-forwards) — 먼저 끝난 배경이 칸이 사라질 때까지
            원래 진하기로 튀어 올라 화면 전체가 한 번 깜빡였다(2026-11-07 프레임 기록으로 확인) */}
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-zinc-950/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-right-10 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-right-10 data-closed:fade-out-0 data-closed:fill-mode-forwards sm:w-[min(1040px,calc(100vw-4rem))] sm:border-l sm:border-zinc-200 dark:bg-zinc-950 sm:dark:border-zinc-800">
          <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 sm:px-6 dark:border-zinc-800">
            {studioId && (
              <Button variant="ghost" className="h-9 shrink-0 rounded-full px-3 text-sm" onClick={backToPosterList}>
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden /> 목록
              </Button>
            )}
            <DialogPrimitive.Title className="font-heading min-w-0 flex-1 truncate text-lg font-semibold text-zinc-900 dark:text-white">
              {projectTitle} 홍보 포스터
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="포스터 칸 닫기"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </header>
          <DialogPrimitive.Description className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[13px] text-zinc-600 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            포스터는 누르는 즉시 저장돼요. 프로젝트의 &ldquo;저장하기&rdquo;와 따로예요.
          </DialogPrimitive.Description>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
            {studioId ? (
              <StudioView key={studioId} projectId={projectId} posterId={studioId} />
            ) : (
              <ListView projectId={projectId} data={list} reload={reloadList} />
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// reload = 올리기·걸기·지우기 뒤, 거는 중일 때 3초마다 다시 읽기
function ListView({ projectId, data, reload: load }: { projectId: string; data: PosterListResult | null; reload: () => void }) {
  if (!data) return <ListSkeleton />;
  if (!data.ok) return <p className="py-10 text-center text-zinc-600 dark:text-zinc-400">{data.error}</p>;
  const { posters, full, madeToday, canUseAi, hasHung, title } = data;

  return (
    <div className="flex flex-col gap-10">
      <PosterBandDownload title={title} projectId={projectId} />
      <section aria-labelledby="posters-title" className="flex flex-col gap-5">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 id="posters-title" className="font-heading text-xl font-semibold text-zinc-900 dark:text-white">
              상세 페이지에 걸 포스터
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              {canUseAi
                ? "직접 만든 포스터 그림을 올리거나 AI로 만들 수 있어요. 하나를 골라 걸면 프로젝트 페이지에 보여요."
                : "직접 만든 포스터 그림을 올리면 프로젝트 페이지에 걸 수 있어요."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PosterUploadButton projectId={projectId} full={full} hangIfNone={!hasHung} onUploaded={load} />
            {canUseAi && <NewPosterButton projectId={projectId} disabled={full || madeToday} onCreated={(id) => openPosterSheet(id)} />}
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {hasHung ? "지금 걸린 포스터에 '걸려 있어요' 표시가 있어요." : "아직 걸린 포스터가 없어요. 아래에서 하나를 골라 걸어 보세요."}
          {full
            ? ` 포스터는 ${POSTER_LIMITS.perProject}개까지예요. 하나를 지우면 올리거나 만들 수 있어요.`
            : canUseAi && madeToday && " AI 포스터는 하루에 하나 새로 만들 수 있어요. 만든 포스터는 계속 고칠 수 있어요."}
        </p>
        {posters.length === 0 ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            아직 포스터가 없어요.{" "}
            {canUseAi
              ? "포스터 그림을 올리거나, 새로 만들기를 누르면 AI가 학교에 붙일 홍보 포스터를 만들어 줘요."
              : "학교 게시판에 붙일 포스터 그림을 올려 보세요."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {posters.map((p) => (
              <li key={p.id} className="flex flex-col gap-2">
                {p.kind === "upload" ? (
                  // 직접 올린 그림은 비율이 제각각이라 A4 비율 상자 안에 맞춘다
                  <a
                    href={p.imageUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="올린 포스터 원본 보기"
                    className="flex aspect-[210/297] items-center justify-center overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본, 상세 아이콘과 같은 방식 */}
                    <img src={p.imageUrl ? posterImageAt(p.imageUrl, 640) : ""} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                  </a>
                ) : (
                  <button
                    type="button"
                    aria-label="포스터 열기"
                    className="block rounded-2xl text-left"
                    onPointerEnter={() => prefetchStudio(projectId, p.id)}
                    onFocus={() => prefetchStudio(projectId, p.id)}
                    onClick={() => openPosterSheet(p.id)}
                  >
                    <PosterPreview html={p.html} artUrl={p.artUrl} title={title} projectId={projectId} tone={p.tone} position={p.position} />
                  </button>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PosterHangButton posterId={p.id} projectId={projectId} hung={p.hung} stale={p.stale} disabled={!p.canHang} onChanged={load} />
                  <DeletePosterButton posterId={p.id} onDeleted={load} />
                </div>
                <span className="text-xs text-zinc-500">
                  {p.kind === "upload" ? "올린 그림 · " : "AI 포스터 · "}
                  {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: ko })} {p.kind === "upload" ? "올림" : "수정"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StudioView({ projectId, posterId }: { projectId: string; posterId: string }) {
  // 미리 받은 것은 한 번만 쓴다 — 다시 열 땐 그새 고친 내용을 새로 받는다
  const [prefetched] = useState(() => {
    const entry = studioPrefetch.get(posterId);
    studioPrefetch.delete(posterId);
    return entry;
  });
  const [data, setData] = useState<PosterStudioResult | null>(prefetched?.value ?? null);
  useEffect(() => {
    if (prefetched?.value) return;
    let alive = true;
    (prefetched?.promise ?? getPosterStudio(projectId, posterId))
      .then((result) => alive && setData(result))
      .catch(() => alive && setData({ ok: false, error: LOAD_FAILED }));
    return () => {
      alive = false;
    };
  }, [projectId, posterId, prefetched]);

  if (!data) return <StudioSkeleton />;
  if (!data.ok) return <p className="py-10 text-center text-zinc-600 dark:text-zinc-400">{data.error}</p>;
  return <PosterStudio initial={data.poster} projectTitle={data.title} artGaveUp={data.artGaveUp} />;
}

// 받기 전 같은 크기 회색 자리(반짝임 없음 — 공용 뼈대와 같은 규칙)
function ListSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden>
      <div className="h-40 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[210/297] rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="@container" aria-hidden>
      <div className="grid gap-8 @4xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="aspect-[210/297] rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-96 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
