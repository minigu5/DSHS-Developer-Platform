"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { adminBanUser, adminFindUsers, adminUnban } from "@/lib/admin/actions";
import type { BanRow } from "@/lib/admin/read";

import { BanButton } from "./ban-dialog";
import { ConfirmAction } from "./confirm-action";

const CARD = "rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

function untilLabel(until: string | null) {
  if (until === null) return "무제한";
  return `${new Date(until).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}까지`;
}

/** 지금 차단 중인 사람 + 사람 찾아서 차단 */
export function BanList({ bans }: { bans: BanRow[] }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[] | null>(null);
  const [searching, start] = useTransition();

  const search = () => start(async () => setFound(await adminFindUsers(query)));

  return (
    <div className={CARD}>
      {bans.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">지금 차단된 사람이 없어요.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {bans.map((b) => (
            <li key={b.banId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {b.name ?? (b.anonymous ? "익명 작성자" : "탈퇴한 사람")}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {untilLabel(b.until)}
                  {b.anonymous && " · 익명 글에서 차단"}
                  {b.reason && ` · ${b.reason}`}
                </p>
              </div>
              <ConfirmAction
                label="풀기"
                title="차단을 풀까요?"
                description="지금부터 다시 글을 쓸 수 있어요. 기록은 남아요."
                confirmLabel="풀기"
                success="차단을 풀었어요"
                action={() => adminUnban(b.banId)}
              />
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임이나 이름으로 사람 찾기"
          aria-label="차단할 사람 찾기"
          className="min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          <Search className="h-4 w-4" aria-hidden />
          찾기
        </button>
      </form>
      {found && (
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {found.length === 0 && <li className="py-3 text-sm text-zinc-500 dark:text-zinc-400">찾는 사람이 없어요.</li>}
          {found.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-2">
              <span className="truncate text-sm text-zinc-800 dark:text-zinc-200">{u.name}</span>
              <BanButton label="차단" who={u.name} onBan={(d, r) => adminBanUser(u.id, d, r)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
