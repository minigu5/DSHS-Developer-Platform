"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { revokeSubdomain, unblockSubdomain } from "@/lib/domains/actions";
import { HOST_PRESETS } from "@/lib/domains/hosts";
import type { AdminDomainRow } from "@/lib/domains/read";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  reserved: "예약",
  pending: "설정 중",
  active: "연결됨",
  broken: "끊김",
  revoked: "회수됨",
};

const SMALL_BTN =
  "inline-flex h-7 items-center rounded-full border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300";

export function AdminDomainTable({ rows }: { rows: AdminDomainRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<AdminDomainRow | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const revoke = () =>
    start(async () => {
      if (!target) return;
      const r = await revokeSubdomain(target.id, reason);
      if (!r.ok) return setError(r.error);
      setTarget(null);
      setReason("");
      router.refresh();
    });

  const unblock = (id: string) =>
    start(async () => {
      const r = await unblockSubdomain(id);
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <>
      {error && !target && (
        <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">주소</th>
              <th scope="col" className="px-4 py-2.5 font-medium">상태</th>
              <th scope="col" className="px-4 py-2.5 font-medium">호스트 → 대상</th>
              <th scope="col" className="px-4 py-2.5 font-medium">프로젝트 · 소유자</th>
              <th scope="col" className="px-4 py-2.5 font-medium">받은 날</th>
              <th scope="col" className="px-4 py-2.5 font-medium"><span className="sr-only">관리</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs">{r.name}.dshs.dev</td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-semibold", r.status === "revoked" ? "text-rose-700 dark:text-rose-300" : "text-zinc-700 dark:text-zinc-300")}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  {r.revokedReason && <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.revokedReason}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {r.host ? `${HOST_PRESETS[r.host].label} → ` : "—"}
                  <span className="font-mono">{r.target ?? ""}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.projectId ? (
                    <Link href={`/projects/${r.projectId}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                      {r.projectTitle ?? "(제목 없음)"}
                    </Link>
                  ) : (
                    <span className="text-zinc-500">(삭제된 프로젝트)</span>
                  )}
                  <span className="text-zinc-500 dark:text-zinc-400"> · {r.ownerName}</span>
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{r.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === "revoked" ? (
                    <button type="button" disabled={pending} onClick={() => unblock(r.id)} className={SMALL_BTN}>
                      이름 풀기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setTarget(r);
                      }}
                      className={cn(SMALL_BTN, "hover:border-rose-400 hover:text-rose-700")}
                    >
                      회수
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">이 주소를 회수할까요?</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{target?.name}.dshs.dev</span> · DNS 레코드를 바로 지우고, 이 이름은 &ldquo;이름 풀기&rdquo; 전까지 아무도 받을 수 없어요. 이유는 학생에게 보여요.</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">회수 이유</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="예: 부적절한 이름"
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <DialogFooter>
            <button type="button" onClick={() => setTarget(null)} disabled={pending} className={cn(SMALL_BTN, "h-9 px-4 text-sm")}>
              취소
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={pending || !reason.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}회수하기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
