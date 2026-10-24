"use client";

interface InsertLineProps {
  label: string;
  /** 화면 읽기 프로그램용 이름. 보이는 문구로 시작해야 한다. */
  ariaLabel: string;
  onInsert: () => void;
}

/** 카드 사이 "+ 여기에 단계 넣기" 줄 버튼. */
export function InsertLine({ label, ariaLabel, onInsert }: InsertLineProps) {
  return (
    <button
      type="button"
      onClick={onInsert}
      aria-label={ariaLabel}
      className="group flex h-11 w-full items-center gap-2.5 rounded-lg text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:text-zinc-900 sm:h-9 dark:text-zinc-400 dark:hover:text-white dark:focus-visible:text-white"
    >
      <span
        className="h-px flex-1 bg-zinc-200 transition-colors group-hover:bg-zinc-400 dark:bg-zinc-800 dark:group-hover:bg-zinc-600"
        aria-hidden
      />
      <span aria-hidden>+ {label}</span>
      <span
        className="h-px flex-1 bg-zinc-200 transition-colors group-hover:bg-zinc-400 dark:bg-zinc-800 dark:group-hover:bg-zinc-600"
        aria-hidden
      />
    </button>
  );
}
