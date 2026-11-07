"use client";

// 관리자 잠금 버튼(이유 입력 창) — 유튜브 저작권 차단처럼 비공개로 잠그면 주인·팀원은 보고 고칠 수 있지만 다시 공개할 수 없다(2026-11-07)

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminLockProject, adminUnlockProject } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

import { ConfirmAction, DANGER_BTN, GHOST_BTN, SMALL_BTN, useAdminAction } from "./confirm-action";

export function LockButton({ projectId, className }: { projectId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useAdminAction();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(SMALL_BTN, className)}>
        잠그고 비공개로
      </button>
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>이 프로젝트를 잠글까요?</DialogTitle>
            <DialogDescription>
              비공개로 바뀌고 연결된 주소도 반납돼요. 만든 사람과 팀원은 계속 보고 고칠 수 있지만, 관리자가 풀 때까지 다시 공개할 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">이유 (선택 · 만든 사람에게 보여요)</span>
            <Input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="예: 다른 사람의 저작물을 허락 없이 사용" className="min-w-0" />
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
                run(() => adminLockProject(projectId, reason), "잠그고 비공개로 바꿨어요", () => {
                  setOpen(false);
                  setReason("");
                })
              }
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              잠그기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UnlockButton({ projectId, className }: { projectId: string; className?: string }) {
  return (
    <ConfirmAction
      label="잠금 풀기"
      title="잠금을 풀까요?"
      description="비공개는 그대로예요. 만든 사람이 원하면 직접 공개로 바꿀 수 있게 돼요."
      confirmLabel="잠금 풀기"
      success="잠금을 풀었어요."
      action={() => adminUnlockProject(projectId)}
      className={className}
    />
  );
}
