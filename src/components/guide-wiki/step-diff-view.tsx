import { cn } from "@/lib/utils";
import type { LineDiff, StepDiff } from "@/lib/guide-wiki/diff";
import { FoldStep } from "@/components/guide-wiki/fold-step";

const CHIP = "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold";
const CHIP_NEUTRAL = cn(CHIP, "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200");
const CHIP_ADDED = cn(CHIP, "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200");
const CHIP_REMOVED = cn(CHIP, "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200");

const LINE_TONE: Record<LineDiff["op"], string> = {
  same: "text-zinc-600 dark:text-zinc-400",
  add: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  del: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
};

/** 줄 단위 비교 결과. 색만으로 구분하지 않게 `+`/`−` 기호에 이름을 단다. */
function Lines({ lines }: { lines: LineDiff[] }) {
  return (
    <div className="font-mono text-[13px] leading-[1.7]">
      {lines.map((line, i) => (
        <div key={i} className={cn("flex gap-2.5 px-4 py-0.5 sm:px-[18px]", LINE_TONE[line.op])}>
          <span className="w-3 shrink-0 text-center font-semibold">
            {line.op === "add" ? (
              <span role="img" aria-label="추가된 줄">
                +
              </span>
            ) : line.op === "del" ? (
              <span role="img" aria-label="삭제된 줄">
                −
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
            {line.text === "" ? " " : line.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function moveText(d: StepDiff): string {
  const move = `↕ ${(d.fromIndex ?? 0) + 1}단계 → ${(d.toIndex ?? 0) + 1}단계로 이동`;
  return d.kind === "same" ? `${move} · 내용 그대로` : move;
}

function Badge({ children, className }: { children: string; className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function StepCard({ d }: { d: StepDiff }) {
  const number = String((d.toIndex ?? 0) + 1);
  const moveChip = d.moved ? <span className={CHIP_NEUTRAL}>{moveText(d)}</span> : null;

  if (d.kind === "removed") {
    return (
      <FoldStep
        tone="removed"
        badge="−"
        title={d.title}
        chips={<span className={CHIP_REMOVED}>삭제된 단계</span>}
      >
        <Lines lines={d.lines} />
      </FoldStep>
    );
  }

  if (d.kind === "same" && !d.moved) {
    return (
      <FoldStep
        tone="same"
        badge={number}
        title={d.title}
        chips={<span className="text-xs text-zinc-500 dark:text-zinc-400">변경 없음</span>}
      >
        <Lines lines={d.lines} />
      </FoldStep>
    );
  }

  const added = d.kind === "added";
  return (
    <section
      aria-label={`${number}단계 ${d.title}`}
      className={cn(
        "overflow-hidden rounded-[18px] border",
        added
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <div
        className={cn(
          "flex min-h-12 flex-wrap items-center gap-x-2.5 gap-y-1.5 px-[18px] py-3",
          d.lines.length > 0 && d.kind !== "same" && "border-b",
          added ? "border-emerald-100 dark:border-emerald-950" : "border-zinc-100 dark:border-zinc-800",
        )}
      >
        <Badge
          className={
            added
              ? "bg-emerald-700 text-white"
              : d.kind === "same"
                ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          }
        >
          {number}
        </Badge>
        <h2 className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-zinc-900 dark:text-white">
          {d.title}
        </h2>
        {added && <span className={CHIP_ADDED}>새 단계</span>}
        {d.kind === "edited" && <span className={CHIP_NEUTRAL}>수정</span>}
        {moveChip}
      </div>
      {d.kind !== "same" && (
        <div className="py-2">
          <Lines lines={d.lines} />
        </div>
      )}
    </section>
  );
}

/** 단계 단위 비교 목록. 새 버전의 순서대로, 삭제된 단계는 원래 자리 근처에 보여 준다. */
export function StepDiffView({ diffs }: { diffs: StepDiff[] }) {
  return (
    <div className="flex flex-col gap-3">
      {diffs.map((d) => (
        <StepCard key={`${d.kind === "removed" ? "x" : "k"}-${d.id}`} d={d} />
      ))}
    </div>
  );
}
