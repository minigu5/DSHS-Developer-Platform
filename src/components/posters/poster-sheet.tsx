"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ImageUp, X } from "lucide-react";

import { posterImageAt } from "@/lib/posters/hang-logic";
import { POSTER_LIMITS } from "@/lib/posters/config";
import { getPosterList, type PosterListResult } from "@/lib/posters/panel";

import { PosterBandDownload } from "./poster-band-download";
import { PosterHangButton } from "./poster-hang-button";
import { DeletePosterButton } from "./poster-list-actions";
import { POSTER_PARAM, closePosterSheet, notePosterSheetPop } from "./poster-sheet-nav";
import { PosterUploadButton, usePosterUpload } from "./poster-upload-button";
import { useFileDrop } from "./use-file-drop";

const LOAD_FAILED = "포스터를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.";

/**
 * 프로젝트 수정 화면 오른쪽에서 나오는 포스터 칸(2026-11-07 사용자 결정 — 수정에서만 들어가는 기능이 따로 된 페이지라 어색해서).
 * 상세 페이지에도 같은 칸을 둔다(2026-11-08 — 옆칸의 빈 포스터 칸·"포스터 바꾸기"가 연다).
 * 띠 받기·올리기·걸기·지우기를 `?poster=list` 로 연다. 휴대폰에선 화면을 다 채운다.
 * 포스터는 누르는 즉시 저장되고, 폼의 "저장하기"와는 따로다.
 *
 * `inForm`: 수정 화면(폼 옆) — 목록을 미리 받고, "저장하기와 따로" 안내를 단다. 상세는 주인·팀원·관리자가 자주 열어서
 * 미리 받지 않고 칸을 열 때 받는다.
 */
export function PosterSheet({ projectId, projectTitle, inForm = true }: { projectId: string; projectTitle: string; inForm?: boolean }) {
  const router = useRouter();
  const value = useSearchParams().get(POSTER_PARAM);
  // 목록은 수정 화면이 열릴 때 미리 받고, 칸을 열 때마다 뒤에서 새로 읽는다(받아 둔 것을 먼저 보여 줌)
  const [list, setList] = useState<PosterListResult | null>(null);
  const loadList = useCallback(() => {
    getPosterList(projectId)
      .then(setList)
      .catch(() => setList({ ok: false, error: LOAD_FAILED }));
  }, [projectId]);
  useEffect(() => {
    if (inForm) loadList();
  }, [inForm, loadList]);
  const open = !!value;
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);
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

  // 닫으면 폼의 「홍보 포스터」 카드(상세면 옆칸의 걸린 포스터)를 새로 읽는다 — 폼에 쓰던 내용은 그대로 남는다.
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
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-right-10 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-right-10 data-closed:fade-out-0 data-closed:fill-mode-forwards sm:w-[min(960px,calc(100vw-4rem))] sm:border-l sm:border-zinc-200 dark:bg-zinc-950 sm:dark:border-zinc-800">
          <header className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 sm:px-6 dark:border-zinc-800">
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
            {inForm ? <>포스터는 누르는 즉시 저장돼요. 프로젝트의 &ldquo;저장하기&rdquo;와 따로예요.</> : "포스터는 누르는 즉시 저장돼요."}
          </DialogPrimitive.Description>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <ListView projectId={projectId} data={list} reload={reloadList} />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// reload = 올리기·걸기·지우기 뒤 목록을 다시 읽는다
function ListView({ projectId, data, reload: load }: { projectId: string; data: PosterListResult | null; reload: () => void }) {
  if (!data) return <ListSkeleton />;
  if (!data.ok) return <p className="py-10 text-center text-zinc-600 dark:text-zinc-400">{data.error}</p>;
  return <ListBody projectId={projectId} data={data} load={load} />;
}

function ListBody({ projectId, data, load }: { projectId: string; data: Extract<PosterListResult, { ok: true }>; load: () => void }) {
  const { posters, full, hasHung, title } = data;
  const uploader = usePosterUpload({ projectId, full, hangIfNone: !hasHung, onUploaded: load });
  // 목록 어디에 놓아도 올린다(버튼만 받으면 놓을 자리가 너무 작다)
  const drop = useFileDrop((file) => void uploader.upload(file));

  return (
    <div className="@container relative flex flex-col gap-8" {...drop.handlers}>
      {drop.dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 z-20 flex items-center justify-center rounded-3xl border-2 border-dashed border-zinc-400 bg-white/90 dark:border-zinc-600 dark:bg-zinc-950/90"
        >
          <p className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
            <ImageUp className="h-5 w-5" aria-hidden />
            {full ? `포스터는 ${POSTER_LIMITS.perProject}개까지예요` : "놓으면 포스터 그림으로 올려요"}
          </p>
        </div>
      )}
      <PosterBandDownload title={title} projectId={projectId} />
      <section aria-labelledby="posters-title" className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-3 @2xl:flex-row @2xl:items-end">
          <div>
            <h2 id="posters-title" className="font-heading text-lg font-semibold text-zinc-900 dark:text-white">
              상세 페이지에 걸 포스터
            </h2>
            {/* 걸린 상태는 카드의 "걸려 있어요" 알약이 보여 줘서 따로 적지 않는다 */}
            <p className="mt-1.5 text-sm break-keep text-zinc-600 dark:text-zinc-400">
              직접 만든 포스터 그림을 올리면(끌어다 놓아도 돼요) 프로젝트 페이지에 걸 수 있어요.
              {full && ` 포스터는 ${POSTER_LIMITS.perProject}개까지예요. 하나를 지우면 올릴 수 있어요.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <PosterUploadButton uploader={uploader} />
          </div>
        </div>
        {posters.length === 0 ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            아직 포스터가 없어요. 학교 게시판에 붙일 포스터 그림을 올려 보세요.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 @2xl:grid-cols-4">
            {posters.map((p) => (
              <li key={p.id} className="flex flex-col gap-2">
                {/* 직접 올린 그림은 비율이 제각각이라 A4 비율 상자 안에 맞춘다 */}
                <a
                  href={p.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="올린 포스터 원본 보기"
                  className="flex aspect-[210/297] items-center justify-center overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본, 상세 아이콘과 같은 방식 */}
                  <img src={posterImageAt(p.imageUrl, 480)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                </a>
                <div className="flex items-start justify-between gap-1">
                  {/* 제목이 이미 "상세 페이지에 걸 포스터"라 버튼은 "걸기"만 — 휴대폰 2열에서도 지우기와 한 줄 */}
                  <div className="min-w-0">
                    <PosterHangButton posterId={p.id} projectId={projectId} hung={p.hung} onChanged={load} label="걸기" />
                  </div>
                  <DeletePosterButton posterId={p.id} onDeleted={load} />
                </div>
                <span className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: ko })} 올림
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// 받기 전 같은 크기 회색 자리(반짝임 없음 — 공용 뼈대와 같은 규칙)
function ListSkeleton() {
  return (
    <div className="@container flex flex-col gap-8" aria-hidden>
      <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 @2xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[210/297] rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
