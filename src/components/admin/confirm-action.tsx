"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdminActionResult } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export const SMALL_BTN =
  "inline-flex h-7 items-center gap-1 rounded-full border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500";
export const DANGER_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-rose-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:opacity-50";
export const GHOST_BTN =
  "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

/** 관리 액션 실행 → 성공 토스트 + 화면 새로 읽기, 실패면 토스트 */
export function useAdminAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<AdminActionResult>, success: string, after?: () => void) =>
    start(async () => {
      const r = await action();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(success);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

/** 확인 창 한 번 뒤 실행하는 작은 버튼(관리자는 이름 입력 없이 — 설계 결정) */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  success,
  action,
  className,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  success: string;
  action: () => Promise<AdminActionResult>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAdminAction();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(SMALL_BTN, className)}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className={GHOST_BTN} disabled={pending}>
              취소
            </button>
            <button type="button" className={DANGER_BTN} disabled={pending} onClick={() => run(action, success, () => setOpen(false))}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** 확인 없이 바로 실행(확인함처럼 되돌릴 일이 없는 것) */
export function QuickAction({
  label,
  success,
  action,
}: {
  label: string;
  success: string;
  action: () => Promise<AdminActionResult>;
}) {
  const { pending, run } = useAdminAction();
  return (
    <button type="button" className={SMALL_BTN} disabled={pending} onClick={() => run(action, success)}>
      {pending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {label}
    </button>
  );
}
