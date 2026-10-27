"use client";

import { Input } from "@/components/ui/input";

/** 되돌리기 어려운 작업의 확인 창에 넣는 칸. 프로젝트 이름을 직접 적어야 버튼이 켜진다. */
export function ConfirmNameInput({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[13px] text-zinc-700 dark:text-zinc-300">
      <span className="break-keep">
        계속하려면 프로젝트 이름을 똑같이 적어 주세요: <strong className="font-semibold text-zinc-900 dark:text-white">{name.trim()}</strong>
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        aria-label="확인용 프로젝트 이름"
        className="h-10"
      />
    </label>
  );
}
