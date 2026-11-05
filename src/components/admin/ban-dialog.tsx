"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { ChoiceRow } from "@/components/forms/choice-row";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/actions";
import { BAN_DURATIONS, type BanDuration } from "@/lib/admin/ban";

import { DANGER_BTN, GHOST_BTN, SMALL_BTN, useAdminAction } from "./confirm-action";

/** 차단 버튼 + 창: 기간(1일·7일·30일·무제한) + 이유(선택) */
export function BanButton({
  label = "작성자 차단",
  who,
  onBan,
}: {
  label?: string;
  /** 창 제목에 쓸 이름 — 익명이면 null */
  who: string | null;
  onBan: (duration: BanDuration, reason: string) => Promise<AdminActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<BanDuration>("7d");
  const [reason, setReason] = useState("");
  const { pending, run } = useAdminAction();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={SMALL_BTN}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{who ? `${who}님을 차단할까요?` : "익명 작성자를 차단할까요?"}</DialogTitle>
            <DialogDescription>차단하면 그동안 새 글·댓글·프로젝트를 올리거나 고칠 수 없어요. 보는 건 그대로 할 수 있어요.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="차단 기간">
            {BAN_DURATIONS.map((d) => (
              <ChoiceRow key={d.value} label={d.label} selected={duration === d.value} onSelect={() => setDuration(d.value)} />
            ))}
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">이유 (선택)</span>
            <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="예: 같은 글 도배" className="min-w-0" />
          </label>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className={GHOST_BTN} disabled={pending}>
              취소
            </button>
            <button
              type="button"
              className={DANGER_BTN}
              disabled={pending}
              onClick={() =>
                run(() => onBan(duration, reason), "차단했어요", () => {
                  setOpen(false);
                  setReason("");
                })
              }
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              차단
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
