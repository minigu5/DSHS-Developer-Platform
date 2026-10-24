"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { revertGuide, type SaveResult } from "@/lib/guide-wiki/actions";
import { versionRo } from "@/lib/guide-wiki/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SAVE_FAILED = "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
const CONFLICT_MESSAGE = "그 사이 새 버전이 저장됐어요. 새로고침한 뒤 다시 시도해 주세요.";
const MAX_REASON = 100;

const TRIGGER_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:min-h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white";

interface RevertDialogProps {
  docKey: string;
  /** 되돌아갈 버전. */
  targetRev: number;
  /** 지금 최신 버전(이 위에 새 버전이 쌓인다). */
  latestRev: number;
  signedIn: boolean;
}

/** "이 버전으로 되돌리기" 버튼과 확인 창. 비로그인이면 로그인으로 가는 링크가 된다. */
export function RevertDialog({ docKey, targetRev, latestRev, signedIn }: RevertDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 연타해도 요청은 하나만 나가게 렌더와 상관없이 바로 잠근다.
  const busyRef = useRef(false);

  const label = "이 버전으로 되돌리기";
  const ariaLabel = `${versionRo(targetRev)} 되돌리기`;

  if (!signedIn) {
    const query = searchParams.toString();
    const next = encodeURIComponent(pathname + (query ? `?${query}` : ""));
    return (
      <Link
        href={`/login?next=${next}`}
        aria-label={`로그인하고 ${ariaLabel}`}
        className={TRIGGER_CLASS}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        {label}
      </Link>
    );
  }

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      setReason("");
      setMessage(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current || reason.trim() === "") return;
    busyRef.current = true;
    setPending(true);
    setMessage(null);
    let result: SaveResult;
    try {
      result = await revertGuide({ key: docKey, targetRev, baseRev: latestRev, reason });
    } catch {
      toast.error(SAVE_FAILED);
      busyRef.current = false;
      setPending(false);
      return;
    }
    if ("revNo" in result) {
      toast.success(`되돌렸어요 (버전 ${result.revNo})`);
      setOpen(false);
      router.refresh();
    } else if ("conflict" in result) {
      setMessage(CONFLICT_MESSAGE);
    } else {
      setMessage(result.error);
    }
    busyRef.current = false;
    setPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={ariaLabel}
        className={TRIGGER_CLASS}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="rounded-3xl p-6 sm:max-w-md">
          <form onSubmit={onSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold">
                {versionRo(targetRev)} 되돌릴까요?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                지금 내용(버전 {latestRev})은 지워지지 않아요. 버전 {targetRev}의 내용이{" "}
                <b className="font-semibold text-zinc-900 dark:text-white">
                  새 {versionRo(latestRev + 1)}
                </b>{" "}
                저장되고, 기록에 내 이름으로 남아요.
              </DialogDescription>
            </DialogHeader>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-900 dark:text-white">
              왜 되돌리나요?
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={MAX_REASON}
                required
                autoComplete="off"
                placeholder="예) 장난 수정 되돌림"
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-normal text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </label>
            {message && (
              <p role="alert" className="text-[13px] text-rose-700 dark:text-rose-400">
                {message}
              </p>
            )}
            <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl p-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 sm:h-10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending || reason.trim() === ""}
                className="inline-flex h-11 items-center justify-center rounded-full bg-purple-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 sm:h-10 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
              >
                {pending ? "되돌리는 중…" : "되돌리기"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
