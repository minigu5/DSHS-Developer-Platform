"use client";

// /admin 「관리자」 — 관리자 추가(이메일)·삭제. 최초 관리자는 목록 맨 위에 고정돼 지울 수 없다(2026-11-17 사용자 결정: 관리자끼리 서로 추가·삭제, 최초 관리자는 불가침).

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { adminAddAdmin, adminRemoveAdmin } from "@/lib/admin/actions";
import type { AdminMemberView } from "@/lib/admin/read";

import { ConfirmAction, SMALL_BTN, useAdminAction } from "./confirm-action";

export function AdminsManager({ admins, myEmail }: { admins: AdminMemberView[]; myEmail: string }) {
  const [email, setEmail] = useState("");
  const { pending, run } = useAdminAction();

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {admins.map((a) => {
          const me = a.email === myEmail;
          return (
            <li key={a.email} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                  {a.label}
                  {me && <span className="ml-1.5 text-xs font-normal text-zinc-500">나</span>}
                  {a.root && <span className="ml-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">최초 관리자</span>}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {a.email}
                  {a.addedAt && ` · ${formatDistanceToNow(new Date(a.addedAt), { addSuffix: true, locale: ko })} ${a.addedBy ?? "알 수 없음"}이(가) 추가`}
                </p>
              </div>
              {a.root ? (
                <span className="self-start text-xs text-zinc-500 sm:self-auto">지울 수 없어요</span>
              ) : me || !a.userId ? null : (
                <ConfirmAction
                  label="관리자에서 빼기"
                  title={`${a.label}님을 관리자에서 뺄까요?`}
                  description="더 이상 관리자 화면과 관리자 권한을 쓸 수 없어요. 계정과 글은 그대로 남아요."
                  confirmLabel="빼기"
                  success="관리자에서 뺐어요."
                  action={() => adminRemoveAdmin(a.userId as string)}
                  className="self-start sm:self-auto"
                />
              )}
            </li>
          );
        })}
      </ul>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => adminAddAdmin(email), "관리자로 추가했어요.", () => setEmail(""));
        }}
      >
        <label htmlFor="admin-email" className="sr-only">
          추가할 관리자 이메일
        </label>
        <Input
          id="admin-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="추가할 사람의 학교 이메일 (…@ts.hs.kr)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1"
        />
        <button type="submit" className={`${SMALL_BTN} h-9 justify-center px-4 text-sm`} disabled={pending || !email.trim()}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          관리자 추가
        </button>
      </form>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">한 번 로그인한 적 있는 계정만 추가할 수 있어요. 관리자는 글·프로젝트·주소·차단을 모두 다룰 수 있고, 다른 관리자를 추가하거나 뺄 수 있어요.</p>
    </div>
  );
}
