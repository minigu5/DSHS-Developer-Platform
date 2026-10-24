"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { saveGuideEdit, type SaveResult } from "@/lib/guide-wiki/actions";
import { computeStats, describeStats } from "@/lib/guide-wiki/diff";
import { titleOf } from "@/lib/guide-wiki/steps";
import type { WikiDoc } from "@/lib/guide-wiki/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocHeader, type DocUsage } from "@/components/guide-wiki/doc-header";
import { StaleBanner } from "@/components/guide-wiki/stale-banner";
import {
  editorReducer,
  initEditorState,
  liveSteps,
  type EditorStep,
} from "@/components/guide-wiki/editor/reducer";
import { InsertLine } from "@/components/guide-wiki/editor/insert-line";
import { SaveBar } from "@/components/guide-wiki/editor/save-bar";
import { GoneStepCard, StepCard, stepDomId } from "@/components/guide-wiki/editor/step-card";
import { WholePreview } from "@/components/guide-wiki/editor/whole-preview";

const SAVE_FAILED = "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

interface GuideWikiEditorProps {
  doc: WikiDoc;
  /** 편집을 시작한 버전. 0 이면 아직 DB 버전이 없고 저장소 원본에서 시작. */
  baseRev: number;
  usages: DocUsage[];
  /** 마지막 seed·sync 이후 저장소 원본이 바뀌었는지. */
  stale: boolean;
  /** 저장·취소 뒤 돌아갈 가이드 경로(검증된 값). */
  from: string | null;
}

/** 다음 렌더 뒤 옮길 포커스. */
type PendingFocus =
  | { kind: "id"; domId: string }
  | { kind: "new-body" }
  | { kind: "move"; id: string; dir: -1 | 1 };

export function GuideWikiEditor({ doc, baseRev: initialBaseRev, usages, stale, from }: GuideWikiEditorProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(editorReducer, doc.steps, initEditorState);
  const [baseRev, setBaseRev] = useState(initialBaseRev);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ latestRev: number } | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  // 연타해도 요청은 하나만 나가게 렌더와 상관없이 바로 잠근다.
  const busyRef = useRef(false);
  // 원본 가져오기(StaleBanner)가 도는 동안은 저장하지 않는다.
  const syncingRef = useRef(false);
  // 저장에 성공해 떠나는 중이면 beforeunload 경고를 끈다.
  const leavingRef = useRef(false);
  const pendingFocus = useRef<PendingFocus | null>(null);

  const historyHref = `/guide-wiki/${doc.key}/history`;
  const exitHref = from ?? historyHref;
  const backHref = from ?? "/guide";

  const live = useMemo(() => liveSteps(state), [state]);
  const changeSummary = useMemo(() => describeStats(computeStats(state.original, live)), [state.original, live]);
  const dirty = changeSummary !== "";
  const canSave = dirty && state.summary.trim() !== "";

  // 저장 안 한 변경이 있으면 새로고침·탭 닫기 때 경고.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (leavingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // 넣기·이동·지우기 뒤 포커스를 알맞은 곳으로 옮긴다.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const frame = requestAnimationFrame(() => {
      if (pending.kind === "id") {
        document.getElementById(pending.domId)?.focus();
      } else if (pending.kind === "new-body") {
        if (state.openId) document.getElementById(stepDomId(state.openId, "body"))?.focus();
      } else {
        const same = document.getElementById(
          stepDomId(pending.id, pending.dir < 0 ? "up" : "down"),
        ) as HTMLButtonElement | null;
        const other = document.getElementById(
          stepDomId(pending.id, pending.dir < 0 ? "down" : "up"),
        ) as HTMLButtonElement | null;
        (same && !same.disabled ? same : other)?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);

  const liveCount = live.length;
  const originalIds = useMemo(() => new Set(state.original.map((s) => s.id)), [state.original]);
  const originalBody = useMemo(
    () => new Map(state.original.map((s) => [s.id, s.body])),
    [state.original],
  );

  function insertAt(at: number) {
    pendingFocus.current = { kind: "new-body" };
    dispatch({ type: "insert", at });
  }

  function move(id: string, dir: -1 | 1) {
    pendingFocus.current = { kind: "move", id, dir };
    dispatch({ type: "move", id, dir });
  }

  function remove(step: EditorStep) {
    if (originalIds.has(step.id)) {
      pendingFocus.current = { kind: "id", domId: stepDomId(step.id, "restore") };
    } else {
      // 새 단계는 사라지므로 바로 앞(없으면 뒤) 살아 있는 카드 머리로.
      const liveList = state.steps.filter((s) => !s.gone);
      const i = liveList.findIndex((s) => s.id === step.id);
      const neighbor = liveList[i - 1] ?? liveList[i + 1];
      if (neighbor) pendingFocus.current = { kind: "id", domId: stepDomId(neighbor.id, "head") };
    }
    dispatch({ type: "remove", id: step.id });
  }

  function restore(id: string) {
    pendingFocus.current = { kind: "id", domId: stepDomId(id, "head") };
    dispatch({ type: "restore", id });
  }

  async function runSave(base: number) {
    if (busyRef.current || syncingRef.current || !canSave) return;
    busyRef.current = true;
    setSaving(true);
    setConflict(null);
    let result: SaveResult;
    try {
      result = await saveGuideEdit({
        key: doc.key,
        baseRev: base,
        title: doc.title,
        steps: live,
        summary: state.summary,
      });
    } catch {
      result = { error: SAVE_FAILED };
    }
    if ("revNo" in result) {
      // 버튼은 잠근 채로 둔다(이동하기 전에 한 번 더 저장되지 않게).
      leavingRef.current = true;
      toast.success(`저장했어요 (버전 ${result.revNo})`);
      router.push(exitHref);
      return;
    }
    if ("conflict" in result) setConflict(result.conflict);
    else toast.error(result.error);
    busyRef.current = false;
    setSaving(false);
  }

  function overwrite() {
    if (!conflict) return;
    const latest = conflict.latestRev;
    setBaseRev(latest);
    void runSave(latest);
  }

  function requestLeave(href: string) {
    if (dirty) setLeaveHref(href);
    else router.push(href);
  }

  function onBackClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    e.preventDefault();
    setLeaveHref(backHref);
  }

  function confirmLeave() {
    if (!leaveHref) return;
    leavingRef.current = true;
    router.push(leaveHref);
  }

  const diffHref = conflict
    ? `/guide-wiki/${doc.key}/diff?from=${Math.max(baseRev, 1)}&to=${conflict.latestRev}`
    : "";

  let liveIndex = 0;

  return (
    <div>
      <div className="px-6 pb-10 pt-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <DocHeader
            backHref={backHref}
            backLabel="가이드로"
            eyebrow={baseRev === 0 ? "고치는 중 · 저장소 원본 기준" : `고치는 중 · 버전 ${baseRev} 기준`}
            title={doc.title}
            usages={usages}
            onBackClick={onBackClick}
            usagesInNewTab
          />

          {stale && (
            <div className="mt-5">
              <StaleBanner
                docKey={doc.key}
                baseRev={baseRev}
                blocked={dirty}
                disabled={saving}
                onSyncingChange={(v) => {
                  syncingRef.current = v;
                }}
              />
            </div>
          )}

          <div className="mb-2 mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => dispatch({ type: "whole" })}
              aria-pressed={state.whole}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors sm:h-10",
                state.whole
                  ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
            >
              {state.whole ? (
                <Pencil className="h-[15px] w-[15px]" aria-hidden />
              ) : (
                <Eye className="h-[15px] w-[15px]" aria-hidden />
              )}
              {state.whole ? "편집으로 돌아가기" : "전체 미리보기"}
            </button>
          </div>

          {state.whole ? (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                저장하면 가이드가 이렇게 보여요. 다시 고치려면 “편집으로 돌아가기”를 누르세요.
              </p>
              <WholePreview steps={live} />
            </div>
          ) : (
            <div>
              <InsertLine
                label="맨 앞에 단계 넣기"
                ariaLabel="맨 앞에 단계 넣기"
                onInsert={() => insertAt(0)}
              />
              {state.steps.map((step, idx) => {
                if (step.gone) {
                  return (
                    <div key={step.id} className="mb-1.5">
                      <GoneStepCard step={step} onRestore={() => restore(step.id)} />
                    </div>
                  );
                }
                const n = ++liveIndex;
                const title = titleOf(step.body);
                const original = originalBody.get(step.id);
                return (
                  <div key={step.id}>
                    <StepCard
                      step={step}
                      n={n}
                      status={original === undefined ? "new" : original !== step.body ? "edited" : null}
                      expanded={state.openId === step.id}
                      mode={state.mode}
                      isFirst={n === 1}
                      isLast={n === liveCount}
                      canRemove={liveCount > 1}
                      onToggle={() => dispatch({ type: "toggle", id: step.id })}
                      onMove={(dir) => move(step.id, dir)}
                      onRemove={() => remove(step)}
                      onEdit={(body) => dispatch({ type: "edit", id: step.id, body })}
                      onMode={(mode) => dispatch({ type: "mode", mode })}
                    />
                    <InsertLine
                      label="여기에 단계 넣기"
                      ariaLabel={`여기에 단계 넣기: ${n}단계 ${title} 다음`}
                      onInsert={() => insertAt(idx + 1)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SaveBar
        changeText={
          dirty
            ? `바뀐 점: ${changeSummary}`
            : "아직 바뀐 게 없어요. 카드를 눌러 펼치면 바로 고칠 수 있어요."
        }
        summary={state.summary}
        onSummary={(text) => dispatch({ type: "summary", text })}
        canSave={canSave}
        saving={saving}
        onSave={() => void runSave(baseRev)}
        onCancel={() => requestLeave(exitHref)}
        conflict={conflict ? { latestRev: conflict.latestRev, diffHref } : null}
        onOverwrite={overwrite}
      />

      <Dialog open={leaveHref !== null} onOpenChange={(open) => !open && setLeaveHref(null)}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">고친 내용을 버릴까요?</DialogTitle>
            <DialogDescription>저장하지 않은 내용은 사라져요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setLeaveHref(null)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              계속 고치기
            </button>
            <button
              type="button"
              onClick={confirmLeave}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-800 sm:h-9"
            >
              버리고 나가기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
