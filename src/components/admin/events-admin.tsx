"use client";

// /admin 「이벤트·수상」 — 이벤트를 만들고 프로젝트에 등위를 매기면 프로젝트 목록·상세에 배지가 붙는다(2026-11-17)

import { useEffect, useState } from "react";
import Link from "@/components/shared/link";
import { Loader2, Plus, Trophy, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { adminCreateEvent, adminDeleteEvent, adminFindProjects, adminRemoveAward, adminSetAward } from "@/lib/admin/actions";
import type { AdminEventView } from "@/lib/admin/read";
import { awardTone } from "@/lib/awards";
import { AwardBadge } from "@/components/projects/award-badge";

import { ConfirmAction, SMALL_BTN, useAdminAction } from "./confirm-action";

const PRIMARY_BTN =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-rose-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:opacity-50";

function NewEvent() {
  const [name, setName] = useState("");
  const { pending, run } = useAdminAction();
  const submit = () => run(() => adminCreateEvent(name), "이벤트를 만들었어요", () => setName(""));
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder="이벤트 이름 (예: 2026 AI-SW 개발 해커톤 주간)"
        aria-label="새 이벤트 이름"
        className="min-w-0 flex-1"
      />
      <button type="submit" disabled={pending || !name.trim()} className={PRIMARY_BTN}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        이벤트 추가
      </button>
    </form>
  );
}

type Found = { id: string; title: string; isPrivate: boolean };

function AddAward({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Found[]>([]);
  const [picked, setPicked] = useState<Found | null>(null);
  const [rank, setRank] = useState("");
  const { pending, run } = useAdminAction();

  useEffect(() => {
    const q = query.trim();
    if (!q || picked) return;
    let stale = false;
    const t = setTimeout(async () => {
      const r = await adminFindProjects(q);
      if (!stale) setResult(r);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, picked]);

  // 검색어가 비었거나 이미 골랐으면 목록은 숨긴다(효과 안에서 비우지 않고 보여 줄 때 거른다)
  const found = query.trim() && !picked ? result : [];

  return (
    <form
      className="grid gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!picked) return;
        run(() => adminSetAward(picked.id, eventId, rank), "등위를 넣었어요", () => {
          setPicked(null);
          setQuery("");
          setRank("");
        });
      }}
    >
      <div className="relative min-w-0">
        {picked ? (
          <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 text-sm dark:border-zinc-700">
            <span className="truncate font-medium text-zinc-900 dark:text-white">{picked.title}</span>
            <button type="button" onClick={() => setPicked(null)} aria-label="프로젝트 다시 고르기" className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="프로젝트 이름으로 찾기" aria-label="프로젝트 찾기" className="min-w-0" />
        )}
        {found.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {found.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(p);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="truncate">{p.title}</span>
                  {p.isPrivate && <span className="shrink-0 text-xs text-zinc-500">비공개</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Input value={rank} maxLength={20} onChange={(e) => setRank(e.target.value)} placeholder="등위 (예: 1위)" aria-label="등위" className="min-w-0" />
      <button type="submit" disabled={pending || !picked || !rank.trim()} className={PRIMARY_BTN}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        등위 넣기
      </button>
    </form>
  );
}

export function EventsAdmin({ events }: { events: AdminEventView[] }) {
  return (
    <div className="grid gap-4">
      <NewEvent />
      {events.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          아직 이벤트가 없어요. 이벤트를 만들고 프로젝트에 등위를 넣으면 프로젝트 목록과 상세에 배지가 붙어요.
        </p>
      )}
      {events.map((ev) => (
        <section key={ev.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <header className="flex items-center justify-between gap-3 px-4 py-3">
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Trophy className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
              <span className="truncate">{ev.name}</span>
              <span className="shrink-0 text-xs font-medium text-zinc-500">{ev.awards.length}개</span>
            </h3>
            <ConfirmAction
              label="이벤트 지우기"
              title="이벤트를 지울까요?"
              description={`"${ev.name}"과 이 이벤트로 받은 등위 ${ev.awards.length}개가 모두 사라져요. 프로젝트는 그대로예요.`}
              confirmLabel="지우기"
              success="이벤트를 지웠어요."
              action={() => adminDeleteEvent(ev.id)}
            />
          </header>
          {ev.awards.length > 0 && (
            <ul className="divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {ev.awards.map((a) => (
                <AwardLine key={a.projectId} eventId={ev.id} eventName={ev.name} award={a} />
              ))}
            </ul>
          )}
          <AddAward eventId={ev.id} />
        </section>
      ))}
    </div>
  );
}

function AwardLine({ eventId, eventName, award }: { eventId: string; eventName: string; award: AdminEventView["awards"][number] }) {
  const { pending, run } = useAdminAction();
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Link href={`/projects/${award.projectId}`} className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-white">
        {award.title}
        {award.isPrivate && <span className="ml-1.5 text-xs font-normal text-zinc-500">비공개</span>}
      </Link>
      <AwardBadge award={{ eventName, rankLabel: award.rankLabel, tone: awardTone(award.rankLabel) }} className="hidden sm:inline-flex" />
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 sm:hidden">{award.rankLabel}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => adminRemoveAward(award.projectId, eventId), "등위를 뺐어요")}
        className={SMALL_BTN}
      >
        빼기
      </button>
    </li>
  );
}
