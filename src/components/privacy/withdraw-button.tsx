"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { withdrawAccount } from "@/lib/privacy/actions";
import { WITHDRAW_CONFIRM_TEXT } from "@/lib/privacy/config";
import { createClient } from "@/lib/supabase/client";

/** 동의 철회 = 탈퇴. 되돌릴 수 없어서 확인 문구를 직접 입력해야 버튼이 켜진다. */
export function WithdrawButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = text.trim() === WITHDRAW_CONFIRM_TEXT;

  function changeOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setText("");
      setError(null);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await withdrawAccount(text);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // 계정은 이미 지워졌다. 헤더(AuthButtons)가 로그아웃 상태를 알게 브라우저 쪽 세션도 정리한다
      await createClient().auth.signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 rounded-full px-4 text-[13px] text-rose-700 dark:text-rose-300"
      >
        <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
        동의 철회하고 탈퇴
      </Button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="gap-4 p-5 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-zinc-900 dark:text-white">정말 탈퇴할까요?</DialogTitle>
            <DialogDescription className="leading-relaxed break-keep">
              동의를 철회하면 아래 정보가 바로 지워지고 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>

          <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>내 계정과 프로필</li>
            <li>내가 올린 프로젝트(팀 프로젝트라면 다른 팀원도 볼 수 없게 돼요), 리뷰, 팁, 댓글, 좋아요, 해줘!, 공지</li>
            <li>올린 이미지(프로필 사진·프로젝트 아이콘·팁 대표 이미지)</li>
          </ul>

          <label className="grid gap-1.5 text-[13px] text-zinc-700 dark:text-zinc-300">
            <span>
              계속하려면 <strong className="font-semibold text-zinc-900 dark:text-white">{WITHDRAW_CONFIRM_TEXT}</strong>을 적어 주세요.
            </span>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={pending}
              autoComplete="off"
              className="h-10"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => changeOpen(false)}
              className="h-10 rounded-full px-4 text-[13px]"
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={!matches || pending}
              onClick={submit}
              className="h-10 rounded-full bg-rose-700 px-5 text-[13px] text-white hover:bg-rose-800"
            >
              {pending ? "지우는 중…" : "철회하고 모두 지우기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
