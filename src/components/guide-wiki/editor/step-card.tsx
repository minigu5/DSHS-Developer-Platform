"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { titleOf } from "@/lib/guide-wiki/steps";
import { StepBody } from "@/components/guide-wiki/step-body";
import { applyIndent } from "@/components/guide-wiki/editor/indent";
import type { EditorMode, EditorStep } from "@/components/guide-wiki/editor/reducer";

export type StepPart = "head" | "up" | "down" | "remove" | "restore" | "body";

/** 포커스를 옮길 때 찾는 DOM id. 단계 id 는 [a-z0-9] 라 그대로 써도 된다. */
export function stepDomId(id: string, part: StepPart): string {
  return `gw-step-${id}-${part}`;
}

const MODES: { value: EditorMode; label: string }[] = [
  { value: "write", label: "작성" },
  { value: "split", label: "나란히" },
  { value: "preview", label: "미리보기" },
];

const INDENT_HINT_ID = "gw-indent-hint";

/** 접힌 카드에 보여 줄 본문 첫 줄(헤딩·코드 울타리 제외). */
function peekOf(body: string): string {
  for (const line of body.split("\n")) {
    const text = line.trim();
    if (text === "" || /^#+(\s|$)/.test(text) || text.startsWith("```")) continue;
    return text;
  }
  return "내용이 비어 있어요";
}

const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent sm:size-9 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:disabled:text-zinc-700";

interface StepCardProps {
  step: EditorStep;
  /** 살아 있는 단계 중 몇 번째인지(1부터). */
  n: number;
  status: "new" | "edited" | null;
  expanded: boolean;
  mode: EditorMode;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onToggle: () => void;
  /** 카드(머리·버튼 밖)나 미리보기를 누르면 펼치고 작성 칸으로 들어간다 */
  onOpenEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onEdit: (body: string) => void;
  onMode: (mode: EditorMode) => void;
}

export function StepCard({
  step,
  n,
  status,
  expanded,
  mode,
  isFirst,
  isLast,
  canRemove,
  onToggle,
  onOpenEdit,
  onMove,
  onRemove,
  onEdit,
  onMode,
}: StepCardProps) {
  const title = titleOf(step.body);
  const panelId = stepDomId(step.id, "body") + "-panel";
  // Esc 를 누른 바로 다음 Tab 은 들여쓰기 대신 칸 밖으로 나간다(키보드 갇힘 방지).
  const escapedRef = useRef(false);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      escapedRef.current = true;
      return;
    }
    if (e.key !== "Tab") {
      escapedRef.current = false;
      return;
    }
    if (escapedRef.current) {
      escapedRef.current = false;
      return;
    }
    e.preventDefault();
    const el = e.currentTarget;
    const next = applyIndent(el.value, el.selectionStart, el.selectionEnd, e.shiftKey);
    onEdit(next.value);
    requestAnimationFrame(() => {
      el.selectionStart = next.selectionStart;
      el.selectionEnd = next.selectionEnd;
    });
  }

  // 버튼·링크를 누른 건 그 동작에 맡기고, 나머지 빈 곳을 누르면 편집으로.
  function openFromPointer(e: MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest("button, a, textarea")) return;
    onOpenEdit();
  }

  const showEditor = mode !== "preview";
  const showPreview = mode !== "write";

  return (
    <div
      onClick={expanded ? undefined : openFromPointer}
      className={cn(
        "rounded-[20px] border bg-white transition-colors dark:bg-zinc-900",
        expanded
          ? "border-zinc-900 dark:border-zinc-100"
          : "cursor-pointer border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600",
      )}
    >
      <div className="flex items-center gap-1 py-1.5 pl-3 pr-1.5 sm:py-2 sm:pl-5 sm:pr-2">
        <button
          type="button"
          id={stepDomId(step.id, "head")}
          onClick={expanded ? onToggle : onOpenEdit}
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
        >
          <span
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] text-[13px] font-semibold transition-colors",
              expanded
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
            )}
          >
            <span className="sr-only">단계 </span>
            {n}
          </span>
          <span className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-zinc-900 dark:text-white">
            {title}
          </span>
          {status === "new" && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              새 단계
            </span>
          )}
          {status === "edited" && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              고침
            </span>
          )}
        </button>
        <button
          type="button"
          id={stepDomId(step.id, "up")}
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label={`${title} 단계를 위로`}
          title="위로"
          className={iconButton}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          id={stepDomId(step.id, "down")}
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label={`${title} 단계를 아래로`}
          title="아래로"
          className={iconButton}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          id={stepDomId(step.id, "remove")}
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`${title} 단계 삭제`}
          title={canRemove ? "삭제" : "마지막 남은 단계는 지울 수 없어요"}
          className={cn(
            iconButton,
            "text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300",
          )}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {expanded ? (
        <div id={panelId} className="flex flex-col gap-2.5 px-3 pb-3 sm:px-5 sm:pb-5">
          <div
            role="group"
            aria-label="보기 방식"
            className="inline-flex gap-0.5 self-start rounded-full bg-zinc-100 p-[3px] dark:bg-zinc-800"
          >
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onMode(m.value)}
                aria-pressed={mode === m.value}
                className={cn(
                  "h-11 rounded-full px-3.5 text-[13px] font-medium transition-colors sm:h-[30px]",
                  mode === m.value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className={cn("grid gap-3", mode === "split" && "sm:grid-cols-2")}>
            {showEditor && (
              <textarea
                id={stepDomId(step.id, "body")}
                value={step.body}
                onChange={(e) => onEdit(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label={`${title} 단계 내용`}
                aria-describedby={INDENT_HINT_ID}
                spellCheck={false}
                className="min-h-[220px] w-full min-w-0 resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 font-mono text-sm leading-relaxed text-zinc-800 outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:border-zinc-300"
              />
            )}
            {showPreview && (
              <div
                onClick={openFromPointer}
                title="누르면 작성 칸으로 가요"
                className="min-h-[220px] min-w-0 cursor-text overflow-auto rounded-2xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500"
              >
                <StepBody body={step.body} />
              </div>
            )}
          </div>
          <span id={INDENT_HINT_ID} className="sr-only">
            Tab 키를 누르면 두 칸 들여써요. 칸 밖으로 나가려면 Esc를 누른 뒤 Tab을 누르세요.
          </span>
        </div>
      ) : (
        <p className="truncate pb-4 pl-[52px] pr-5 text-sm leading-relaxed text-zinc-500 sm:pl-[60px] dark:text-zinc-400">
          {peekOf(step.body)}
        </p>
      )}
    </div>
  );
}

interface GoneStepCardProps {
  step: EditorStep;
  onRestore: () => void;
}

/** 원본에 있던 단계를 지웠을 때 그 자리에 남는 점선 칸. */
export function GoneStepCard({ step, onRestore }: GoneStepCardProps) {
  const title = titleOf(step.body);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-dashed border-zinc-300 bg-zinc-50 py-2 pl-5 pr-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
      <span className="min-w-0">
        <s className="break-words">{title}</s> 단계를 지웠어요
      </span>
      <button
        type="button"
        id={stepDomId(step.id, "restore")}
        onClick={onRestore}
        aria-label={`${title} 단계 되돌리기`}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-zinc-300 bg-white px-4 text-[13px] font-medium text-zinc-900 transition-colors hover:bg-zinc-100 sm:min-h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
      >
        되돌리기
      </button>
    </div>
  );
}
